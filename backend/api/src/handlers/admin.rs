//! Endpoints d'administration — réservés au rôle `admin`.

use actix_web::{get, web, HttpResponse};
use entity::{message, part, poll, rider, spot, user, video};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter};
use serde_json::json;

use crate::{auth::AuthUser, errors::ApiResult, AppState};

/// Vue d'ensemble du tableau de bord admin : compteurs globaux.
#[get("/admin/stats")]
pub async fn stats(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let db = &state.db;

    let users = user::Entity::find().count(db).await?;
    let admins = user::Entity::find()
        .filter(user::Column::Role.eq("admin"))
        .count(db)
        .await?;
    let parts = part::Entity::find().count(db).await?;
    let spots = spot::Entity::find().count(db).await?;
    let spots_pending = spot::Entity::find()
        .filter(spot::Column::Approved.eq(false))
        .count(db)
        .await?;
    let messages = message::Entity::find().count(db).await?;
    let polls = poll::Entity::find().count(db).await?;
    let riders = rider::Entity::find().count(db).await?;
    let videos = video::Entity::find().count(db).await?;

    Ok(HttpResponse::Ok().json(json!({
        "users": users,
        "admins": admins,
        "parts": parts,
        "spots": spots,
        "spots_pending": spots_pending,
        "messages": messages,
        "polls": polls,
        "riders": riders,
        "videos": videos,
    })))
}
