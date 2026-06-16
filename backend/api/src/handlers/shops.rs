use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::shop;
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

#[derive(Debug, Deserialize)]
pub struct ShopQuery {
    pub city: Option<String>,
    /// Inclure les shops non encore validés (admin/modération).
    #[serde(default)]
    pub include_pending: bool,
}

/// Annuaire des BMX shops validés, triés par ville puis nom.
#[get("/shops")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<ShopQuery>,
) -> ApiResult<HttpResponse> {
    let mut query = shop::Entity::find();
    if !q.include_pending {
        query = query.filter(shop::Column::Approved.eq(true));
    }
    if let Some(c) = &q.city {
        query = query.filter(shop::Column::City.eq(c.clone()));
    }
    let items = query
        .order_by_asc(shop::Column::City)
        .order_by_asc(shop::Column::Name)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/shops/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = shop::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateShop {
    #[validate(length(min = 1, max = 120))]
    pub name: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub city: Option<String>,
    pub address: Option<String>,
    #[validate(range(min = -90.0, max = 90.0))]
    pub latitude: Option<f64>,
    #[validate(range(min = -180.0, max = 180.0))]
    pub longitude: Option<f64>,
    #[validate(url)]
    pub url: Option<String>,
    pub photo_url: Option<String>,
}

/// Soumet un shop. Validé d'office si l'auteur est admin, sinon en attente.
#[post("/shops")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateShop>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let now = Utc::now();
    let inserted = shop::ActiveModel {
        id: NotSet,
        name: Set(ammonia::clean(p.name.trim())),
        description: Set(p.description.map(|d| ammonia::clean(d.trim()))),
        city: Set(p.city.map(|c| ammonia::clean(c.trim()))),
        address: Set(p.address.map(|a| ammonia::clean(a.trim()))),
        latitude: Set(p.latitude),
        longitude: Set(p.longitude),
        url: Set(p.url),
        photo_url: Set(p.photo_url),
        submitted_by: Set(Some(auth.id())),
        approved: Set(auth.is_admin()),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;
    Ok(HttpResponse::Created().json(inserted))
}

/// Valide un shop en attente (admin).
#[post("/shops/{id}/approve")]
pub async fn approve(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let item = shop::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: shop::ActiveModel = item.into();
    m.approved = Set(true);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
