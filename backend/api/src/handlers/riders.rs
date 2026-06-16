use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::{rider, rider_rating};
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
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

/// Classement : meilleure moyenne d'abord, puis le plus de votes.
#[get("/riders")]
pub async fn index(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let items = rider::Entity::find()
        .order_by_desc(rider::Column::AvgRating)
        .order_by_desc(rider::Column::RatingsCount)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/riders/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = rider::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRider {
    #[validate(length(min = 1, max = 120))]
    pub name: String,
    pub country: Option<String>,
    pub photo_url: Option<String>,
    pub instagram: Option<String>,
    pub bio: Option<String>,
}

#[post("/riders")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateRider>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let now = Utc::now();
    let inserted = rider::ActiveModel {
        id: NotSet,
        name: Set(ammonia::clean(p.name.trim())),
        source: Set("manual".into()),
        external_id: Set(None),
        country: Set(p.country),
        photo_url: Set(p.photo_url),
        instagram: Set(p.instagram),
        bio: Set(p.bio.map(|b| ammonia::clean(&b))),
        avg_rating: Set(Decimal::ZERO),
        ratings_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;
    Ok(HttpResponse::Created().json(inserted))
}

#[derive(Debug, Deserialize, Validate)]
pub struct RatePayload {
    #[validate(range(min = 1, max = 10))]
    pub score: i32,
}

/// Note un rider (1–10). Un seul vote par utilisateur : re-noter met à jour.
#[post("/riders/{id}/rate")]
pub async fn rate(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
    body: web::Json<RatePayload>,
) -> ApiResult<HttpResponse> {
    let rider_id = id.into_inner();
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let rider_row = rider::Entity::find_by_id(rider_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    let now = Utc::now();
    match rider_rating::Entity::find()
        .filter(rider_rating::Column::RiderId.eq(rider_id))
        .filter(rider_rating::Column::UserId.eq(auth.id()))
        .one(&state.db)
        .await?
    {
        Some(existing) => {
            let mut m: rider_rating::ActiveModel = existing.into();
            m.score = Set(p.score);
            m.updated_at = Set(now);
            m.update(&state.db).await?;
        }
        None => {
            rider_rating::ActiveModel {
                id: NotSet,
                rider_id: Set(rider_id),
                user_id: Set(auth.id()),
                score: Set(p.score),
                created_at: Set(now),
                updated_at: Set(now),
            }
            .insert(&state.db)
            .await?;
        }
    }

    // Recalcule la moyenne et le nombre de votes depuis la source de vérité.
    let ratings = rider_rating::Entity::find()
        .filter(rider_rating::Column::RiderId.eq(rider_id))
        .all(&state.db)
        .await?;
    let count = ratings.len() as i32;
    let avg = if count > 0 {
        let sum: i64 = ratings.iter().map(|r| r.score as i64).sum();
        Decimal::from_f64(sum as f64 / count as f64)
            .unwrap_or(Decimal::ZERO)
            .round_dp(2)
    } else {
        Decimal::ZERO
    };

    let mut m: rider::ActiveModel = rider_row.into();
    m.avg_rating = Set(avg);
    m.ratings_count = Set(count);
    m.updated_at = Set(now);
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
