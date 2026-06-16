use actix_web::{get, post, web, HttpResponse};
use chrono::{DateTime, Duration, Utc};
use entity::{session_member, bmx_session, user};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, ModelTrait, NotSet, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use serde_json::json;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

/// Session + organisateur + participants (ids et noms).
async fn session_json(
    db: &sea_orm::DatabaseConnection,
    s: &bmx_session::Model,
) -> ApiResult<serde_json::Value> {
    let members = session_member::Entity::find()
        .filter(session_member::Column::SessionId.eq(s.id))
        .all(db)
        .await?;
    let mut ids: Vec<i32> = members.iter().map(|m| m.user_id).collect();
    ids.push(s.user_id);
    let users = user::Entity::find()
        .filter(user::Column::Id.is_in(ids))
        .all(db)
        .await?;
    let by_id: std::collections::HashMap<i32, &user::Model> =
        users.iter().map(|u| (u.id, u)).collect();

    let host = by_id.get(&s.user_id);
    let mut v = serde_json::to_value(s).map_err(|e| ApiError::Internal(e.to_string()))?;
    if let Some(map) = v.as_object_mut() {
        map.insert(
            "host".into(),
            json!({
                "id": s.user_id,
                "username": host.map(|u| u.username.clone()),
                "display_name": host.map(|u| u.display_name.clone()),
                "avatar_url": host.and_then(|u| u.avatar_url.clone()),
            }),
        );
        map.insert(
            "members".into(),
            json!(members
                .iter()
                .map(|m| {
                    let u = by_id.get(&m.user_id);
                    json!({
                        "id": m.user_id,
                        "username": u.map(|x| x.username.clone()),
                        "display_name": u.map(|x| x.display_name.clone()),
                        "avatar_url": u.and_then(|x| x.avatar_url.clone()),
                    })
                })
                .collect::<Vec<_>>()),
        );
        map.insert("members_count".into(), json!(members.len()));
    }
    Ok(v)
}

#[derive(Debug, Deserialize)]
pub struct SessionQuery {
    pub city: Option<String>,
    /// Inclure les sessions passées.
    #[serde(default)]
    pub include_past: bool,
}

/// Sessions à venir (par défaut), de la plus proche à la plus lointaine.
#[get("/sessions")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<SessionQuery>,
) -> ApiResult<HttpResponse> {
    let mut query = bmx_session::Entity::find();
    if !q.include_past {
        // Marge de 3 h : une session en cours reste visible.
        query = query.filter(bmx_session::Column::StartsAt.gte(Utc::now() - Duration::hours(3)));
    }
    if let Some(c) = &q.city {
        query = query.filter(bmx_session::Column::City.eq(c.clone()));
    }
    let items = query
        .order_by_asc(bmx_session::Column::StartsAt)
        .all(&state.db)
        .await?;

    let mut out = Vec::with_capacity(items.len());
    for s in &items {
        out.push(session_json(&state.db, s).await?);
    }
    Ok(HttpResponse::Ok().json(out))
}

#[get("/sessions/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let s = bmx_session::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(session_json(&state.db, &s).await?))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateSession {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    pub city: Option<String>,
    pub spot_id: Option<i32>,
    /// Date/heure de rendez-vous (RFC 3339).
    pub starts_at: DateTime<Utc>,
}

/// Propose une session. L'organisateur est inscrit d'office.
#[post("/sessions")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateSession>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    if p.starts_at < Utc::now() - Duration::hours(1) {
        return Err(ApiError::BadRequest("la session doit être à venir".into()));
    }
    let now = Utc::now();
    let inserted = bmx_session::ActiveModel {
        id: NotSet,
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        description: Set(p.description.map(|d| ammonia::clean(d.trim()))),
        city: Set(p.city.map(|c| ammonia::clean(c.trim()))),
        spot_id: Set(p.spot_id),
        starts_at: Set(p.starts_at),
        created_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    session_member::ActiveModel {
        id: NotSet,
        session_id: Set(inserted.id),
        user_id: Set(auth.id()),
        created_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    Ok(HttpResponse::Created().json(session_json(&state.db, &inserted).await?))
}

/// Rejoint une session.
#[post("/sessions/{id}/join")]
pub async fn join(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let s = bmx_session::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let already = session_member::Entity::find()
        .filter(session_member::Column::SessionId.eq(s.id))
        .filter(session_member::Column::UserId.eq(auth.id()))
        .one(&state.db)
        .await?;
    if already.is_none() {
        session_member::ActiveModel {
            id: NotSet,
            session_id: Set(s.id),
            user_id: Set(auth.id()),
            created_at: Set(Utc::now()),
        }
        .insert(&state.db)
        .await?;

        // Notifie l'organisateur (tâche de fond).
        if state.push.enabled() && s.user_id != auth.id() {
            let joiner = user::Entity::find_by_id(auth.id())
                .one(&state.db)
                .await?
                .map(|u| u.display_name)
                .unwrap_or_else(|| "Quelqu'un".into());
            let db = state.db.clone();
            let cfg = state.push.clone();
            let host_id = s.user_id;
            let payload = json!({
                "title": "Nouveau rider 🚲",
                "body": format!("{joiner} rejoint « {} »", s.title),
                "url": "#tab=spots",
                "tag": format!("session-{}", s.id),
            });
            actix_web::rt::spawn(async move {
                crate::push::notify_user(&db, &cfg, host_id, &payload).await;
            });
        }
    }
    Ok(HttpResponse::Ok().json(session_json(&state.db, &s).await?))
}

/// Quitte une session.
#[post("/sessions/{id}/leave")]
pub async fn leave(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let s = bmx_session::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if let Some(m) = session_member::Entity::find()
        .filter(session_member::Column::SessionId.eq(s.id))
        .filter(session_member::Column::UserId.eq(auth.id()))
        .one(&state.db)
        .await?
    {
        m.delete(&state.db).await?;
    }
    Ok(HttpResponse::Ok().json(session_json(&state.db, &s).await?))
}
