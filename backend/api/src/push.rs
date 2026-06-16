//! Web Push (notifications natives navigateur) — VAPID + chiffrement aes128gcm.
//!
//! 100 % RustCrypto via `web-push-native` : aucune dépendance OpenSSL, on
//! réutilise le client `reqwest` partagé pour l'envoi.
//!
//! Variables d'environnement :
//!   VAPID_PRIVATE_KEY   clé privée P-256 (scalaire 32 octets, base64url) — active le push
//!   VAPID_SUBJECT       contact `mailto:` ou URL (par défaut mailto:hello@bmx.app)
//!
//! La clé publique (point SEC1 non compressé, base64url) est *dérivée* de la
//! clé privée et exposée au front via `GET /push/vapid` — pas de second secret
//! à configurer. Génère une paire avec : `openssl ecparam -genkey -name prime256v1`
//! puis encode le scalaire en base64url (voir README), ou tout outil VAPID.

use base64ct::{Base64UrlUnpadded, Encoding};
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use web_push_native::{
    jwt_simple::algorithms::ES256KeyPair,
    p256::{elliptic_curve::sec1::ToEncodedPoint, PublicKey, SecretKey},
    Auth, WebPushBuilder,
};

#[derive(Clone)]
pub struct PushConfig {
    private_key_b64: Option<String>,
    /// Clé publique dérivée (base64url), à passer au front comme applicationServerKey.
    pub public_key_b64: Option<String>,
    subject: String,
}

impl PushConfig {
    pub fn from_env() -> Self {
        let nonempty = |k: &str| std::env::var(k).ok().filter(|v| !v.trim().is_empty());
        let private_key_b64 = nonempty("VAPID_PRIVATE_KEY");
        let subject = nonempty("VAPID_SUBJECT")
            .unwrap_or_else(|| "mailto:hello@bmx.app".to_string());
        let public_key_b64 = private_key_b64.as_deref().and_then(derive_public_b64);
        if private_key_b64.is_some() && public_key_b64.is_none() {
            tracing::warn!("VAPID_PRIVATE_KEY présente mais invalide — push désactivé");
        }
        Self {
            private_key_b64,
            public_key_b64,
            subject,
        }
    }

    /// Le push est actif si une clé privée valide a pu être dérivée.
    pub fn enabled(&self) -> bool {
        self.public_key_b64.is_some()
    }

    fn keypair(&self) -> Option<ES256KeyPair> {
        let raw = self.private_key_b64.as_deref()?;
        let bytes = Base64UrlUnpadded::decode_vec(raw).ok()?;
        ES256KeyPair::from_bytes(&bytes).ok()
    }
}

/// Dérive la clé publique VAPID (point SEC1 non compressé, base64url) du scalaire privé.
fn derive_public_b64(private_b64: &str) -> Option<String> {
    let bytes = Base64UrlUnpadded::decode_vec(private_b64).ok()?;
    let sk = SecretKey::from_slice(&bytes).ok()?;
    let point = sk.public_key().to_encoded_point(false);
    Some(Base64UrlUnpadded::encode_string(point.as_bytes()))
}

/// Envoie une notification à tous les abonnements d'un utilisateur.
///
/// Conçu pour être lancé en tâche de fond : ne renvoie pas d'erreur, journalise
/// les échecs, et purge les abonnements expirés (404/410) au passage.
pub async fn notify_user(
    db: &DatabaseConnection,
    cfg: &PushConfig,
    user_id: i32,
    payload: &serde_json::Value,
) {
    let Some(keypair) = cfg.keypair() else { return };
    let subs = match entity::push_subscription::Entity::find()
        .filter(entity::push_subscription::Column::UserId.eq(user_id))
        .all(db)
        .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::warn!("push: lecture abonnements échouée: {e}");
            return;
        }
    };
    if subs.is_empty() {
        return;
    }

    let body = serde_json::to_vec(payload).unwrap_or_default();
    let client = crate::importers::http_client();

    for sub in subs {
        match send_one(&client, &keypair, &cfg.subject, &sub, body.clone()).await {
            Ok(status) if status == 404 || status == 410 => {
                // Abonnement disparu : on le supprime.
                let _ = entity::push_subscription::Entity::delete_by_id(sub.id)
                    .exec(db)
                    .await;
            }
            Ok(status) if !(200..300).contains(&status) => {
                tracing::warn!("push: envoi refusé ({status}) endpoint={}", sub.endpoint);
            }
            Ok(_) => {}
            Err(e) => tracing::warn!("push: envoi échoué: {e}"),
        }
    }
}

/// Construit et envoie une requête Web Push pour un abonnement unique.
/// Renvoie le code HTTP du service de push.
async fn send_one(
    client: &reqwest::Client,
    keypair: &ES256KeyPair,
    subject: &str,
    sub: &entity::push_subscription::Model,
    body: Vec<u8>,
) -> Result<u16, Box<dyn std::error::Error + Send + Sync>> {
    let p256dh = Base64UrlUnpadded::decode_vec(&sub.p256dh)?;
    let auth = Base64UrlUnpadded::decode_vec(&sub.auth)?;
    if auth.len() != 16 {
        return Err("clé auth invalide".into());
    }
    let builder = WebPushBuilder::new(
        sub.endpoint.parse()?,
        PublicKey::from_sec1_bytes(&p256dh)?,
        Auth::clone_from_slice(&auth),
    )
    .with_vapid(keypair, subject);

    let request = builder.build(body)?;
    let (parts, payload) = request.into_parts();

    let mut rb = client.post(parts.uri.to_string());
    for (name, value) in parts.headers.iter() {
        rb = rb.header(name.as_str(), value.as_bytes());
    }
    let resp = rb.body(payload).send().await?;
    Ok(resp.status().as_u16())
}
