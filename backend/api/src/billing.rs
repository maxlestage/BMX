//! Intégration Stripe (abonnement premium « bmx+ »), via l'API REST.
//!
//! Volontairement sans grosse dépendance : appels HTTP avec `reqwest` et
//! vérification de signature des webhooks en HMAC-SHA256.
//!
//! Variables d'environnement :
//!   STRIPE_SECRET_KEY      sk_live_… / sk_test_…   (active la facturation)
//!   STRIPE_PRICE_ID        price_…  (prix récurrent de l'abonnement)
//!   STRIPE_WEBHOOK_SECRET  whsec_…  (signature des webhooks)
//!   APP_BASE_URL           URL du front (redirections Checkout/Portal)

use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set,
};
use sha2::Sha256;

use crate::errors::ApiError;

#[derive(Clone)]
pub struct BillingConfig {
    pub secret_key: Option<String>,
    pub price_id: Option<String>,
    pub webhook_secret: Option<String>,
    pub app_base_url: String,
    /// Jeton Bearer attendu sur les webhooks RevenueCat (Authorization).
    pub revenuecat_auth: Option<String>,
}

impl BillingConfig {
    pub fn from_env() -> Self {
        let nonempty = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        Self {
            secret_key: nonempty("STRIPE_SECRET_KEY"),
            price_id: nonempty("STRIPE_PRICE_ID"),
            webhook_secret: nonempty("STRIPE_WEBHOOK_SECRET"),
            app_base_url: std::env::var("APP_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string()),
            revenuecat_auth: nonempty("REVENUECAT_WEBHOOK_AUTH"),
        }
    }

    pub fn enabled(&self) -> bool {
        self.secret_key.is_some() && self.price_id.is_some()
    }
    fn key(&self) -> Result<&str, ApiError> {
        self.secret_key
            .as_deref()
            .ok_or_else(|| ApiError::BadRequest("paiement non configuré".into()))
    }
}

/// Encodage application/x-www-form-urlencoded (clés Stripe avec crochets).
fn form_encode(pairs: &[(&str, &str)]) -> String {
    fn enc(s: &str) -> String {
        let mut out = String::with_capacity(s.len());
        for b in s.bytes() {
            match b {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    out.push(b as char)
                }
                _ => out.push_str(&format!("%{b:02X}")),
            }
        }
        out
    }
    pairs
        .iter()
        .map(|(k, v)| format!("{}={}", enc(k), enc(v)))
        .collect::<Vec<_>>()
        .join("&")
}

async fn stripe_post(
    cfg: &BillingConfig,
    path: &str,
    pairs: &[(&str, &str)],
) -> Result<serde_json::Value, ApiError> {
    let key = cfg.key()?;
    let res = crate::importers::http_client()
        .post(format!("https://api.stripe.com/v1/{path}"))
        .basic_auth(key, Some(""))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(form_encode(pairs))
        .send()
        .await
        .map_err(|e| ApiError::Internal(format!("stripe: {e}")))?;
    let status = res.status();
    let text = res.text().await.unwrap_or_default();
    let json: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
    if !status.is_success() {
        let msg = json
            .get("error")
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("erreur Stripe");
        return Err(ApiError::Internal(format!("stripe {status}: {msg}")));
    }
    Ok(json)
}

/// Crée (ou réutilise) le client Stripe d'un utilisateur, renvoie son id.
pub async fn ensure_customer(
    db: &DatabaseConnection,
    cfg: &BillingConfig,
    user: &entity::user::Model,
) -> Result<String, ApiError> {
    if let Some(id) = &user.stripe_customer_id {
        return Ok(id.clone());
    }
    let uid = user.id.to_string();
    let json = stripe_post(
        cfg,
        "customers",
        &[
            ("email", user.email.as_str()),
            ("name", user.display_name.as_str()),
            ("metadata[user_id]", uid.as_str()),
        ],
    )
    .await?;
    let cust = json
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::Internal("stripe: id client manquant".into()))?
        .to_string();

    let mut m: entity::user::ActiveModel = user.clone().into();
    m.stripe_customer_id = Set(Some(cust.clone()));
    m.updated_at = Set(Utc::now());
    m.update(db).await?;
    Ok(cust)
}

/// Session Checkout d'abonnement → URL de paiement hébergée par Stripe.
pub async fn checkout_url(cfg: &BillingConfig, customer: &str) -> Result<String, ApiError> {
    let price = cfg
        .price_id
        .as_deref()
        .ok_or_else(|| ApiError::BadRequest("paiement non configuré".into()))?;
    let base = cfg.app_base_url.trim_end_matches('/');
    let success = format!("{base}/?upgraded=1");
    let json = stripe_post(
        cfg,
        "checkout/sessions",
        &[
            ("mode", "subscription"),
            ("customer", customer),
            ("line_items[0][price]", price),
            ("line_items[0][quantity]", "1"),
            ("allow_promotion_codes", "true"),
            ("success_url", &success),
            ("cancel_url", base),
        ],
    )
    .await?;
    json.get("url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| ApiError::Internal("stripe: url checkout manquante".into()))
}

/// Session du portail de facturation (gérer / annuler l'abonnement).
pub async fn portal_url(cfg: &BillingConfig, customer: &str) -> Result<String, ApiError> {
    let base = cfg.app_base_url.trim_end_matches('/');
    let json = stripe_post(
        cfg,
        "billing_portal/sessions",
        &[("customer", customer), ("return_url", base)],
    )
    .await?;
    json.get("url")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| ApiError::Internal("stripe: url portail manquante".into()))
}

/// Vérifie la signature `Stripe-Signature` d'un webhook (HMAC-SHA256, ±5 min).
pub fn verify_signature(cfg: &BillingConfig, payload: &[u8], sig_header: &str) -> bool {
    let Some(secret) = &cfg.webhook_secret else {
        return false;
    };
    let mut timestamp: Option<i64> = None;
    let mut signatures: Vec<&str> = Vec::new();
    for part in sig_header.split(',') {
        let mut kv = part.splitn(2, '=');
        match (kv.next(), kv.next()) {
            (Some("t"), Some(v)) => timestamp = v.trim().parse().ok(),
            (Some("v1"), Some(v)) => signatures.push(v.trim()),
            _ => {}
        }
    }
    let Some(ts) = timestamp else { return false };
    // Tolérance temporelle (rejoue / horloge).
    if (Utc::now().timestamp() - ts).abs() > 300 {
        return false;
    }
    let mut mac = match Hmac::<Sha256>::new_from_slice(secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(format!("{ts}.").as_bytes());
    mac.update(payload);
    let expected = hex::encode(mac.finalize().into_bytes());
    // Comparaison constante.
    signatures
        .iter()
        .any(|s| constant_eq(s.as_bytes(), expected.as_bytes()))
}

fn constant_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

async fn user_by_customer(
    db: &DatabaseConnection,
    customer: &str,
) -> Result<Option<entity::user::Model>, ApiError> {
    Ok(entity::user::Entity::find()
        .filter(entity::user::Column::StripeCustomerId.eq(customer))
        .one(db)
        .await?)
}

/// Applique un évènement Stripe (déjà vérifié) à l'état premium d'un user.
pub async fn handle_event(db: &DatabaseConnection, event: &serde_json::Value) -> Result<(), ApiError> {
    let kind = event.get("type").and_then(|t| t.as_str()).unwrap_or("");
    let obj = event
        .get("data")
        .and_then(|d| d.get("object"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let customer = obj.get("customer").and_then(|c| c.as_str());

    match kind {
        "checkout.session.completed" => {
            if let Some(cust) = customer {
                if let Some(user) = user_by_customer(db, cust).await? {
                    let sub = obj.get("subscription").and_then(|s| s.as_str());
                    let mut m: entity::user::ActiveModel = user.into();
                    if let Some(sub) = sub {
                        m.stripe_subscription_id = Set(Some(sub.to_string()));
                    }
                    // Provisoire : confirmé par l'évènement subscription.updated.
                    m.premium_until = Set(Some(Utc::now() + chrono::Duration::days(31)));
                    m.updated_at = Set(Utc::now());
                    m.update(db).await?;
                }
            }
        }
        "customer.subscription.created" | "customer.subscription.updated"
        | "customer.subscription.deleted" => {
            if let Some(cust) = customer {
                if let Some(user) = user_by_customer(db, cust).await? {
                    let status = obj.get("status").and_then(|s| s.as_str()).unwrap_or("");
                    let period_end = obj
                        .get("current_period_end")
                        .and_then(|v| v.as_i64())
                        .and_then(|t| DateTime::<Utc>::from_timestamp(t, 0));
                    let sub_id = obj.get("id").and_then(|s| s.as_str());

                    let active = matches!(status, "active" | "trialing" | "past_due");
                    let until: Option<DateTime<Utc>> = if kind == "customer.subscription.deleted"
                        || !active
                    {
                        // Accès jusqu'à la fin de période si connue, sinon révoque.
                        period_end.or(Some(Utc::now()))
                    } else {
                        period_end
                    };

                    let mut m: entity::user::ActiveModel = user.into();
                    m.premium_until = Set(until);
                    if kind == "customer.subscription.deleted" {
                        m.stripe_subscription_id = Set(None);
                    } else if let Some(sid) = sub_id {
                        m.stripe_subscription_id = Set(Some(sid.to_string()));
                    }
                    m.updated_at = Set(Utc::now());
                    m.update(db).await?;
                }
            }
        }
        _ => {}
    }
    Ok(())
}

/// Applique un webhook RevenueCat (achat in-app iOS/Android).
/// `app_user_id` = id de notre utilisateur (posé par l'app mobile).
pub async fn handle_revenuecat(
    db: &DatabaseConnection,
    payload: &serde_json::Value,
) -> Result<(), ApiError> {
    let event = payload.get("event").unwrap_or(payload);
    let kind = event.get("type").and_then(|t| t.as_str()).unwrap_or("");
    let app_user_id = event
        .get("app_user_id")
        .and_then(|v| v.as_str())
        .and_then(|s| s.parse::<i32>().ok());
    let Some(uid) = app_user_id else {
        return Ok(()); // utilisateur anonyme RevenueCat — ignoré
    };
    let exp = event
        .get("expiration_at_ms")
        .and_then(|v| v.as_i64())
        .and_then(|ms| DateTime::<Utc>::from_timestamp_millis(ms));

    let until = match kind {
        "EXPIRATION" | "BILLING_ISSUE" => exp.or(Some(Utc::now())),
        _ => exp, // INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, CANCELLATION (accès jusqu'à exp)…
    };
    let Some(until) = until else { return Ok(()) };

    if let Some(user) = entity::user::Entity::find_by_id(uid).one(db).await? {
        let mut m: entity::user::ActiveModel = user.into();
        m.premium_until = Set(Some(until));
        m.updated_at = Set(Utc::now());
        m.update(db).await?;
    }
    Ok(())
}

/// Vérifie le jeton Bearer d'un webhook RevenueCat.
pub fn verify_revenuecat_auth(cfg: &BillingConfig, header: Option<&str>) -> bool {
    match &cfg.revenuecat_auth {
        Some(secret) => {
            let expected = format!("Bearer {secret}");
            header
                .map(|h| constant_eq(h.as_bytes(), expected.as_bytes()))
                .unwrap_or(false)
        }
        None => false,
    }
}

/// Premium actif pour un utilisateur (lecture en base).
pub async fn is_premium(db: &DatabaseConnection, user_id: i32) -> bool {
    entity::user::Entity::find_by_id(user_id)
        .one(db)
        .await
        .ok()
        .flatten()
        .and_then(|u| u.premium_until)
        .map(|d| d > Utc::now())
        .unwrap_or(false)
}
