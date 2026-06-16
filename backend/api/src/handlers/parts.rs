use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::part;
use sea_orm::{
    ActiveModelTrait, EntityTrait, NotSet, PaginatorTrait, QueryOrder, Set,
};
use serde::Deserialize;
use serde_json::json;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    handlers::Pagination,
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct PartQuery {
    #[serde(default)]
    pub sort: String, // "popular" | "recent" (défaut)
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[get("/parts")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<PartQuery>,
) -> ApiResult<HttpResponse> {
    let (page, per_page) = Pagination {
        page: q.page.unwrap_or(1),
        per_page: q.per_page.unwrap_or(20),
    }
    .normalized();
    let mut query = part::Entity::find();
    query = if q.sort == "popular" {
        query.order_by_desc(part::Column::LikesCount)
    } else {
        query.order_by_desc(part::Column::CreatedAt)
    };
    let items = query
        .paginate(&state.db, per_page)
        .fetch_page(page - 1)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

/// Détail d'une part + incrément du compteur de vues.
#[get("/parts/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = part::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: part::ActiveModel = item.into();
    let next = m.views_count.take().unwrap_or(0) + 1;
    m.views_count = Set(next);
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}

/// Effets de montage appliqués (tous optionnels).
#[derive(Debug, Deserialize)]
pub struct Effects {
    #[serde(default)]
    pub vhs: bool,
    #[serde(default)]
    pub fisheye: f32,
    #[serde(default)]
    pub grain: f32,
    #[serde(default)]
    pub slowmo: f32,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePart {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    /// Vidéo : `video_media_id` (uploadé via POST /media) prioritaire, sinon URL.
    pub video_media_id: Option<i32>,
    pub video_url: Option<String>,
    pub thumbnail_media_id: Option<i32>,
    pub thumbnail_url: Option<String>,
    pub sound_id: Option<i32>,
    pub effects: Option<Effects>,
    #[validate(range(min = 1, max = 180))]
    pub duration_secs: i32,
}

#[post("/parts")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreatePart>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    // Tous les effets de montage (grain, VHS, fisheye, slow-mo) sont réservés
    // à bmx+. Les non-premium qui en demandent sont refusés clairement.
    let effects = match p.effects {
        Some(e) => {
            let any = e.vhs || e.fisheye > 0.0 || e.slowmo > 0.0 || e.grain > 0.0;
            if any && !crate::billing::is_premium(&state.db, auth.id()).await {
                return Err(ApiError::Forbidden);
            }
            json!({
                "vhs": e.vhs,
                "fisheye": e.fisheye.clamp(0.0, 1.0),
                "grain": e.grain.clamp(0.0, 1.0),
                "slowmo": e.slowmo.clamp(0.0, 1.0),
            })
        }
        None => json!({}),
    };

    let video_url =
        crate::handlers::media::resolve_url(&state, p.video_media_id, p.video_url, "video").await?;
    let thumbnail_url = match (p.thumbnail_media_id, p.thumbnail_url) {
        (None, None) => None,
        (mid, url) => {
            Some(crate::handlers::media::resolve_url(&state, mid, url, "image").await?)
        }
    };

    let now = Utc::now();
    let model = part::ActiveModel {
        id: NotSet,
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        video_url: Set(video_url),
        thumbnail_url: Set(thumbnail_url),
        sound_id: Set(p.sound_id),
        effects: Set(effects),
        duration_secs: Set(p.duration_secs),
        likes_count: Set(0),
        views_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

#[post("/parts/{id}/like")]
pub async fn like(
    state: web::Data<AppState>,
    _auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let item = part::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: part::ActiveModel = item.into();
    let next = m.likes_count.take().unwrap_or(0) + 1;
    m.likes_count = Set(next);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
