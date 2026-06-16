use actix_web::{get, post, web, HttpResponse};
use entity::video;
use sea_orm::{EntityTrait, QueryOrder};
use serde_json::json;

use crate::{
    auth::AuthUser,
    errors::ApiResult,
    AppState,
};

/// Dernières vidéos (plus récentes d'abord).
#[get("/videos")]
pub async fn index(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let items = video::Entity::find()
        .order_by_desc(video::Column::PublishedAt)
        .order_by_desc(video::Column::CreatedAt)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/videos/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = video::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(crate::errors::ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

/// Déclenche un cycle d'import immédiat (admin). Tourne en tâche de fond.
#[post("/import/run")]
pub async fn run_import(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let db = state.db.clone();
    tokio::spawn(async move {
        crate::importers::run_all(&db).await;
    });
    Ok(HttpResponse::Accepted().json(json!({ "status": "import lancé" })))
}
