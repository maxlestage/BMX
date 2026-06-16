use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::artwork;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    handlers::Pagination,
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct ArtworkQuery {
    pub kind: Option<String>, // drawing | logo | sticker | graphic
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

#[get("/artworks")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<ArtworkQuery>,
) -> ApiResult<HttpResponse> {
    let (page, per_page) = Pagination {
        page: q.page.unwrap_or(1),
        per_page: q.per_page.unwrap_or(20),
    }
    .normalized();
    let mut query = artwork::Entity::find();
    if let Some(kind) = &q.kind {
        query = query.filter(artwork::Column::Kind.eq(kind.clone()));
    }
    let items = query
        .order_by_desc(artwork::Column::CreatedAt)
        .paginate(&state.db, per_page)
        .fetch_page(page - 1)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/artworks/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = artwork::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateArtwork {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    pub description: Option<String>,
    /// Image : `image_media_id` (uploadé via POST /media) prioritaire, sinon URL.
    pub image_media_id: Option<i32>,
    pub image_url: Option<String>,
    pub kind: Option<String>,
}

#[post("/artworks")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateArtwork>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let image_url =
        crate::handlers::media::resolve_url(&state, p.image_media_id, p.image_url, "image").await?;
    let now = Utc::now();
    let model = artwork::ActiveModel {
        id: NotSet,
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        description: Set(p.description.map(|d| ammonia::clean(&d))),
        image_url: Set(image_url),
        kind: Set(p.kind.unwrap_or_else(|| "drawing".into())),
        likes_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

#[post("/artworks/{id}/like")]
pub async fn like(
    state: web::Data<AppState>,
    _auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let item = artwork::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: artwork::ActiveModel = item.into();
    let next = m.likes_count.take().unwrap_or(0) + 1;
    m.likes_count = Set(next);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
