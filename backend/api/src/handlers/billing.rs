use actix_web::{post, web, HttpRequest, HttpResponse};
use entity::user;
use sea_orm::EntityTrait;
use serde_json::json;

use crate::{
    auth::AuthUser,
    billing,
    errors::{ApiError, ApiResult},
    AppState,
};

/// Démarre un abonnement : renvoie l'URL de paiement Stripe Checkout.
#[post("/billing/checkout")]
pub async fn checkout(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    if !state.billing.enabled() {
        return Err(ApiError::BadRequest("paiement non configuré".into()));
    }
    let user = user::Entity::find_by_id(auth.id())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let customer = billing::ensure_customer(&state.db, &state.billing, &user).await?;
    let url = billing::checkout_url(&state.billing, &customer).await?;
    Ok(HttpResponse::Ok().json(json!({ "url": url })))
}

/// Portail de gestion (changer de carte, annuler…). Renvoie l'URL Stripe.
#[post("/billing/portal")]
pub async fn portal(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    if !state.billing.enabled() {
        return Err(ApiError::BadRequest("paiement non configuré".into()));
    }
    let user = user::Entity::find_by_id(auth.id())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let customer = billing::ensure_customer(&state.db, &state.billing, &user).await?;
    let url = billing::portal_url(&state.billing, &customer).await?;
    Ok(HttpResponse::Ok().json(json!({ "url": url })))
}

/// Webhook Stripe (non authentifié, vérifié par signature).
#[post("/billing/webhook")]
pub async fn webhook(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Bytes,
) -> ApiResult<HttpResponse> {
    let sig = req
        .headers()
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !billing::verify_signature(&state.billing, &body, sig) {
        return Err(ApiError::BadRequest("signature webhook invalide".into()));
    }
    let event: serde_json::Value =
        serde_json::from_slice(&body).map_err(|_| ApiError::BadRequest("corps invalide".into()))?;
    billing::handle_event(&state.db, &event).await?;
    Ok(HttpResponse::Ok().json(json!({ "received": true })))
}

/// Webhook RevenueCat (achat in-app mobile). Authentifié par jeton Bearer.
#[post("/billing/revenuecat")]
pub async fn revenuecat(
    state: web::Data<AppState>,
    req: HttpRequest,
    body: web::Bytes,
) -> ApiResult<HttpResponse> {
    let header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok());
    if !billing::verify_revenuecat_auth(&state.billing, header) {
        return Err(ApiError::Unauthorized);
    }
    let payload: serde_json::Value =
        serde_json::from_slice(&body).map_err(|_| ApiError::BadRequest("corps invalide".into()))?;
    billing::handle_revenuecat(&state.db, &payload).await?;
    Ok(HttpResponse::Ok().json(json!({ "received": true })))
}
