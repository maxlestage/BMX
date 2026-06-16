use actix_web::{get, post, web, HttpResponse};
use chrono::{DateTime, Utc};
use entity::featured_account;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

/// Le(s) compte(s) actuellement mis en avant (période en cours).
#[get("/featured/current")]
pub async fn current(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let now = Utc::now();
    let items = featured_account::Entity::find()
        .filter(featured_account::Column::FeaturedFrom.lte(now))
        .filter(featured_account::Column::FeaturedTo.gte(now))
        .order_by_desc(featured_account::Column::FeaturedFrom)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

/// Historique complet des mises en avant.
#[get("/featured")]
pub async fn index(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let items = featured_account::Entity::find()
        .order_by_desc(featured_account::Column::FeaturedFrom)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateFeatured {
    #[validate(length(min = 1, max = 80))]
    pub handle: String,
    pub platform: Option<String>,
    #[validate(length(min = 1, max = 120))]
    pub display_name: String,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    /// week | month
    pub period: Option<String>,
    pub featured_from: DateTime<Utc>,
    pub featured_to: DateTime<Utc>,
}

#[post("/featured")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateFeatured>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let now = Utc::now();
    let inserted = featured_account::ActiveModel {
        id: NotSet,
        handle: Set(p.handle.trim().trim_start_matches('@').to_string()),
        platform: Set(p.platform.unwrap_or_else(|| "instagram".into())),
        display_name: Set(ammonia::clean(p.display_name.trim())),
        description: Set(p.description.map(|d| ammonia::clean(&d))),
        avatar_url: Set(p.avatar_url),
        period: Set(p.period.unwrap_or_else(|| "week".into())),
        featured_from: Set(p.featured_from),
        featured_to: Set(p.featured_to),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;
    Ok(HttpResponse::Created().json(inserted))
}
