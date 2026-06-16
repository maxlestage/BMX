use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::push_subscription;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, QueryFilter, Set,
};
use serde::Deserialize;
use serde_json::json;

use crate::{auth::AuthUser, errors::ApiResult, AppState};

/// Clé publique VAPID (applicationServerKey) + état du service. Public.
#[get("/push/vapid")]
pub async fn vapid(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    Ok(HttpResponse::Ok().json(json!({
        "enabled": state.push.enabled(),
        "public_key": state.push.public_key_b64,
    })))
}

#[derive(Debug, Deserialize)]
pub struct SubscribeKeys {
    pub p256dh: String,
    pub auth: String,
}

#[derive(Debug, Deserialize)]
pub struct Subscribe {
    pub endpoint: String,
    pub keys: SubscribeKeys,
}

/// Enregistre (ou met à jour) un abonnement Web Push pour l'utilisateur courant.
#[post("/push/subscribe")]
pub async fn subscribe(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<Subscribe>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();

    // Un endpoint est unique : s'il existe déjà, on le réassigne à cet utilisateur
    // et on rafraîchit les clés (rotation côté navigateur).
    if let Some(existing) = push_subscription::Entity::find()
        .filter(push_subscription::Column::Endpoint.eq(p.endpoint.clone()))
        .one(&state.db)
        .await?
    {
        let mut m: push_subscription::ActiveModel = existing.into();
        m.user_id = Set(auth.id());
        m.p256dh = Set(p.keys.p256dh);
        m.auth = Set(p.keys.auth);
        m.update(&state.db).await?;
    } else {
        push_subscription::ActiveModel {
            id: NotSet,
            user_id: Set(auth.id()),
            endpoint: Set(p.endpoint),
            p256dh: Set(p.keys.p256dh),
            auth: Set(p.keys.auth),
            created_at: Set(Utc::now()),
        }
        .insert(&state.db)
        .await?;
    }
    Ok(HttpResponse::NoContent().finish())
}

#[derive(Debug, Deserialize)]
pub struct Unsubscribe {
    pub endpoint: String,
}

/// Supprime un abonnement Web Push (désinscription depuis le navigateur).
#[post("/push/unsubscribe")]
pub async fn unsubscribe(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<Unsubscribe>,
) -> ApiResult<HttpResponse> {
    push_subscription::Entity::delete_many()
        .filter(push_subscription::Column::Endpoint.eq(body.into_inner().endpoint))
        .filter(push_subscription::Column::UserId.eq(auth.id()))
        .exec(&state.db)
        .await?;
    Ok(HttpResponse::NoContent().finish())
}
