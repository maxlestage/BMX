use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::spot;
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
pub struct SpotQuery {
    pub spot_type: Option<String>,
    pub city: Option<String>,
    /// Inclure les spots non encore validés (admin/modération).
    #[serde(default)]
    pub include_pending: bool,
}

/// Tous les spots validés (pour la carte). Filtrage optionnel par type/ville.
#[get("/spots")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<SpotQuery>,
) -> ApiResult<HttpResponse> {
    let mut query = spot::Entity::find();
    if !q.include_pending {
        query = query.filter(spot::Column::Approved.eq(true));
    }
    if let Some(t) = &q.spot_type {
        query = query.filter(spot::Column::SpotType.eq(t.clone()));
    }
    if let Some(c) = &q.city {
        query = query.filter(spot::Column::City.eq(c.clone()));
    }
    let items = query
        .order_by_desc(spot::Column::CreatedAt)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/spots/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = spot::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSpot {
    #[validate(length(min = 1, max = 120))]
    pub name: String,
    pub description: Option<String>,
    #[validate(range(min = -90.0, max = 90.0))]
    pub latitude: f64,
    #[validate(range(min = -180.0, max = 180.0))]
    pub longitude: f64,
    pub city: Option<String>,
    pub spot_type: Option<String>,
    pub photo_url: Option<String>,
    /// Galerie de photos (URLs), jusqu'à 12.
    #[serde(default)]
    pub photos: Vec<String>,
}

/// Soumet un spot. Validé d'office si l'auteur est admin, sinon en attente.
#[post("/spots")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateSpot>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let now = Utc::now();

    // Galerie : photo_url (couverture) en tête, puis photos[], dédupliqué, max 12.
    let mut gallery: Vec<String> = Vec::new();
    for url in p.photo_url.iter().cloned().chain(p.photos.iter().cloned()) {
        let u = url.trim().to_string();
        if !u.is_empty() && !gallery.contains(&u) {
            gallery.push(u);
        }
    }
    gallery.truncate(12);
    let cover = gallery.first().cloned();

    let model = spot::ActiveModel {
        id: NotSet,
        name: Set(ammonia::clean(p.name.trim())),
        description: Set(p.description.map(|d| ammonia::clean(&d))),
        latitude: Set(p.latitude),
        longitude: Set(p.longitude),
        city: Set(p.city.map(|c| ammonia::clean(&c))),
        spot_type: Set(p.spot_type.unwrap_or_else(|| "street".into())),
        photo_url: Set(cover),
        photos: Set(serde_json::json!(gallery)),
        submitted_by: Set(Some(auth.id())),
        approved: Set(auth.is_admin()),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

/// Valide un spot en attente (admin).
#[post("/spots/{id}/approve")]
pub async fn approve(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let item = spot::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: spot::ActiveModel = item.into();
    m.approved = Set(true);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
