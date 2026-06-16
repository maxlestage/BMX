use std::future::{ready, Ready};

use actix_web::{dev::Payload, web, FromRequest, HttpRequest};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::{errors::ApiError, AppState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: i32,
    pub role: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Clone)]
pub struct JwtConfig {
    secret: String,
    ttl_hours: i64,
}

impl JwtConfig {
    pub fn from_env() -> Self {
        let secret =
            std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string());
        let ttl_hours = std::env::var("JWT_TTL_HOURS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(72);
        Self { secret, ttl_hours }
    }

    pub fn issue(&self, user_id: i32, role: &str) -> Result<String, ApiError> {
        let now = Utc::now();
        let claims = Claims {
            sub: user_id,
            role: role.to_string(),
            iat: now.timestamp() as usize,
            exp: (now + Duration::hours(self.ttl_hours)).timestamp() as usize,
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )
        .map_err(|e| ApiError::Internal(format!("jwt encode: {e}")))
    }

    pub fn verify(&self, token: &str) -> Result<Claims, ApiError> {
        let data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::new(Algorithm::HS256),
        )
        .map_err(|_| ApiError::Unauthorized)?;
        Ok(data.claims)
    }
}

/// Hache un mot de passe en clair (Argon2id).
pub fn hash_password(password: &str) -> Result<String, ApiError> {
    let salt = SaltString::generate(&mut OsRng);
    Ok(Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| ApiError::Internal(format!("hash error: {e}")))?
        .to_string())
}

/// Vérifie un mot de passe contre son hash stocké.
pub fn verify_password(password: &str, hash: &str) -> bool {
    PasswordHash::new(hash)
        .map(|parsed| {
            Argon2::default()
                .verify_password(password.as_bytes(), &parsed)
                .is_ok()
        })
        .unwrap_or(false)
}

/// Extracteur d'utilisateur authentifié (Bearer JWT).
pub struct AuthUser(pub Claims);

impl AuthUser {
    pub fn id(&self) -> i32 {
        self.0.sub
    }
    pub fn is_admin(&self) -> bool {
        self.0.role == "admin"
    }
    pub fn require_admin(&self) -> Result<(), ApiError> {
        if self.is_admin() {
            Ok(())
        } else {
            Err(ApiError::Forbidden)
        }
    }
}

impl FromRequest for AuthUser {
    type Error = ApiError;
    type Future = Ready<Result<Self, ApiError>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let result = (|| -> Result<AuthUser, ApiError> {
            let token = req
                .headers()
                .get("Authorization")
                .and_then(|v| v.to_str().ok())
                .and_then(|h| h.strip_prefix("Bearer "))
                .ok_or(ApiError::Unauthorized)?;
            let state = req
                .app_data::<web::Data<AppState>>()
                .ok_or_else(|| ApiError::Internal("app state missing".into()))?;
            let claims = state.jwt.verify(token)?;
            Ok(AuthUser(claims))
        })();
        ready(result)
    }
}
