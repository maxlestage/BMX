use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::{part, user};
use sea_orm::{ActiveModelTrait, ColumnTrait, Condition, EntityTrait, NotSet, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use serde_json::json;
use validator::Validate;

use crate::{
    auth::{hash_password, verify_password, AuthUser},
    errors::{ApiError, ApiResult},
    AppState,
};

#[derive(Debug, Serialize)]
pub struct UserDto {
    pub id: i32,
    pub username: String,
    pub display_name: String,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub stance: String,
    pub instagram: Option<String>,
    pub city: Option<String>,
    pub role: String,
    pub is_premium: bool,
    pub premium_until: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<user::Model> for UserDto {
    fn from(u: user::Model) -> Self {
        let is_premium = u.premium_until.map(|d| d > Utc::now()).unwrap_or(false);
        Self {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            bio: u.bio,
            avatar_url: u.avatar_url,
            stance: u.stance,
            instagram: u.instagram,
            city: u.city,
            role: u.role,
            is_premium,
            premium_until: u.premium_until,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub token: String,
    pub user: UserDto,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterPayload {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 3, max = 30))]
    pub username: String,
    #[validate(length(min = 1, max = 60))]
    pub display_name: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[post("/register")]
pub async fn register(
    state: web::Data<AppState>,
    body: web::Json<RegisterPayload>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let email = p.email.trim().to_lowercase();
    let username = p.username.trim().to_lowercase();
    let display_name = ammonia::clean(p.display_name.trim());

    let clash = user::Entity::find()
        .filter(
            Condition::any()
                .add(user::Column::Email.eq(email.clone()))
                .add(user::Column::Username.eq(username.clone())),
        )
        .one(&state.db)
        .await?;
    if clash.is_some() {
        return Err(ApiError::Conflict("email ou pseudo déjà pris".into()));
    }

    let now = Utc::now();
    let model = user::ActiveModel {
        id: NotSet,
        email: Set(email),
        username: Set(username),
        display_name: Set(display_name),
        password_hash: Set(hash_password(&p.password)?),
        bio: NotSet,
        avatar_url: NotSet,
        stance: Set("unknown".into()),
        instagram: NotSet,
        city: NotSet,
        role: Set("user".into()),
        stripe_customer_id: NotSet,
        stripe_subscription_id: NotSet,
        premium_until: NotSet,
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    let token = state.jwt.issue(inserted.id, &inserted.role)?;
    Ok(HttpResponse::Created().json(TokenResponse {
        token,
        user: UserDto::from(inserted),
    }))
}

#[derive(Debug, Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

#[post("/login")]
pub async fn login(
    state: web::Data<AppState>,
    body: web::Json<LoginPayload>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    let email = p.email.trim().to_lowercase();

    let found = user::Entity::find()
        .filter(user::Column::Email.eq(email))
        .one(&state.db)
        .await?
        .ok_or(ApiError::Unauthorized)?;

    if !verify_password(&p.password, &found.password_hash) {
        return Err(ApiError::Unauthorized);
    }
    let token = state.jwt.issue(found.id, &found.role)?;
    Ok(HttpResponse::Ok().json(TokenResponse {
        token,
        user: UserDto::from(found),
    }))
}

#[get("/me")]
pub async fn me(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    let found = user::Entity::find_by_id(auth.id())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(UserDto::from(found)))
}

/// Profil public d'un membre (sans email ni champs sensibles).
#[get("/users/{id}")]
pub async fn profile(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let uid = id.into_inner();
    let found = user::Entity::find_by_id(uid)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    // Stats publiques : nombre de parts + total de likes/vues.
    let parts = part::Entity::find()
        .filter(part::Column::UserId.eq(uid))
        .all(&state.db)
        .await?;
    let total_likes: i64 = parts.iter().map(|p| p.likes_count as i64).sum();
    let total_views: i64 = parts.iter().map(|p| p.views_count as i64).sum();
    Ok(HttpResponse::Ok().json(json!({
        "user": UserDto::from(found),
        "parts_count": parts.len(),
        "total_likes": total_likes,
        "total_views": total_views,
    })))
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMePayload {
    #[validate(length(max = 500))]
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub stance: Option<String>,
    pub instagram: Option<String>,
    pub city: Option<String>,
    #[validate(length(min = 1, max = 60))]
    pub display_name: Option<String>,
}

#[post("/me")]
pub async fn update_me(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<UpdateMePayload>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let found = user::Entity::find_by_id(auth.id())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let mut m: user::ActiveModel = found.into();

    if let Some(v) = p.bio {
        m.bio = Set(Some(ammonia::clean(&v)));
    }
    if let Some(v) = p.avatar_url {
        m.avatar_url = Set(Some(v));
    }
    if let Some(v) = p.stance {
        m.stance = Set(v);
    }
    if let Some(v) = p.instagram {
        m.instagram = Set(Some(v));
    }
    if let Some(v) = p.city {
        m.city = Set(Some(ammonia::clean(&v)));
    }
    if let Some(v) = p.display_name {
        m.display_name = Set(ammonia::clean(&v));
    }
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(UserDto::from(updated)))
}

/// Stats agrégées de l'utilisateur (réservé à bmx+).
#[get("/me/stats")]
pub async fn me_stats(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    if !crate::billing::is_premium(&state.db, auth.id()).await {
        return Err(ApiError::Forbidden);
    }
    let parts = part::Entity::find()
        .filter(part::Column::UserId.eq(auth.id()))
        .all(&state.db)
        .await?;
    let total_likes: i64 = parts.iter().map(|p| p.likes_count as i64).sum();
    let total_views: i64 = parts.iter().map(|p| p.views_count as i64).sum();
    Ok(HttpResponse::Ok().json(json!({
        "parts_count": parts.len(),
        "total_likes": total_likes,
        "total_views": total_views,
    })))
}
