use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::sound;
use sea_orm::{
    ActiveModelTrait, EntityTrait, NotSet, PaginatorTrait, QueryOrder, Set,
};
use serde::Deserialize;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    handlers::Pagination,
    AppState,
};

#[get("/sounds")]
pub async fn index(
    state: web::Data<AppState>,
    page: web::Query<Pagination>,
) -> ApiResult<HttpResponse> {
    let (page, per_page) = page.normalized();
    let items = sound::Entity::find()
        .order_by_desc(sound::Column::CreatedAt)
        .paginate(&state.db, per_page)
        .fetch_page(page - 1)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/sounds/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = sound::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSound {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    pub artist: Option<String>,
    /// Audio : `audio_media_id` (uploadé via POST /media) prioritaire, sinon URL.
    pub audio_media_id: Option<i32>,
    pub audio_url: Option<String>,
    #[validate(range(min = 1, max = 600))]
    pub duration_secs: i32,
    pub genre: Option<String>,
}

#[post("/sounds")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateSound>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let audio_url =
        crate::handlers::media::resolve_url(&state, p.audio_media_id, p.audio_url, "audio").await?;
    let now = Utc::now();
    let model = sound::ActiveModel {
        id: NotSet,
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        artist: Set(p.artist.map(|a| ammonia::clean(&a))),
        audio_url: Set(audio_url),
        duration_secs: Set(p.duration_secs),
        genre: Set(p.genre),
        downloads_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

/// Incrémente le compteur de téléchargements (quand on récupère le son pour une part).
#[post("/sounds/{id}/download")]
pub async fn download(
    state: web::Data<AppState>,
    _auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let item = sound::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: sound::ActiveModel = item.into();
    let next = m.downloads_count.take().unwrap_or(0) + 1;
    m.downloads_count = Set(next);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
