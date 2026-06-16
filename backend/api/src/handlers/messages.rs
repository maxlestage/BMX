use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::{message, user};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Condition, EntityTrait, NotSet, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use serde::Deserialize;
use serde_json::json;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

/// Liste des conversations : dernier message échangé avec chaque interlocuteur.
#[get("/messages")]
pub async fn conversations(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    let me = auth.id();
    // Tous les messages où je suis impliqué, du plus récent au plus ancien.
    let msgs = message::Entity::find()
        .filter(
            Condition::any()
                .add(message::Column::SenderId.eq(me))
                .add(message::Column::RecipientId.eq(me)),
        )
        .order_by_desc(message::Column::CreatedAt)
        .all(&state.db)
        .await?;

    // Dédoublonne par interlocuteur (le 1er rencontré = le plus récent).
    let mut seen = std::collections::HashSet::new();
    let mut threads: Vec<(i32, message::Model)> = Vec::new();
    for m in msgs {
        let other = if m.sender_id == me { m.recipient_id } else { m.sender_id };
        if seen.insert(other) {
            threads.push((other, m));
        }
    }

    // Joint le profil de l'interlocuteur.
    let mut out = Vec::with_capacity(threads.len());
    for (other, last) in threads {
        let u = user::Entity::find_by_id(other).one(&state.db).await?;
        out.push(json!({
            "user_id": other,
            "username": u.as_ref().map(|x| x.username.clone()),
            "display_name": u.as_ref().map(|x| x.display_name.clone()),
            "avatar_url": u.as_ref().and_then(|x| x.avatar_url.clone()),
            "last_body": last.body,
            "last_at": last.created_at,
            "unread": last.recipient_id == me && !last.read,
        }));
    }
    Ok(HttpResponse::Ok().json(out))
}

/// Nombre de messages reçus non lus (pour le badge / la cloche).
#[get("/messages/unread/count")]
pub async fn unread_count(state: web::Data<AppState>, auth: AuthUser) -> ApiResult<HttpResponse> {
    let n = message::Entity::find()
        .filter(message::Column::RecipientId.eq(auth.id()))
        .filter(message::Column::Read.eq(false))
        .count(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(json!({ "count": n })))
}

/// Fil de discussion avec un utilisateur (ordre chronologique). Marque comme lu.
#[get("/messages/{user_id}")]
pub async fn thread(
    state: web::Data<AppState>,
    auth: AuthUser,
    user_id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let me = auth.id();
    let other = user_id.into_inner();
    let msgs = message::Entity::find()
        .filter(
            Condition::any()
                .add(
                    Condition::all()
                        .add(message::Column::SenderId.eq(me))
                        .add(message::Column::RecipientId.eq(other)),
                )
                .add(
                    Condition::all()
                        .add(message::Column::SenderId.eq(other))
                        .add(message::Column::RecipientId.eq(me)),
                ),
        )
        .order_by_asc(message::Column::CreatedAt)
        .all(&state.db)
        .await?;

    // Marque comme lus les messages reçus non lus.
    for m in msgs.iter().filter(|m| m.recipient_id == me && !m.read) {
        let mut am: message::ActiveModel = m.clone().into();
        am.read = Set(true);
        am.update(&state.db).await?;
    }

    Ok(HttpResponse::Ok().json(msgs))
}

#[derive(Debug, Deserialize, Validate)]
pub struct SendMessage {
    pub recipient_id: i32,
    #[validate(length(min = 1, max = 2000))]
    pub body: String,
}

/// Envoie un message à un utilisateur.
#[post("/messages")]
pub async fn send(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<SendMessage>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    if p.recipient_id == auth.id() {
        return Err(ApiError::BadRequest("impossible de s'écrire à soi-même".into()));
    }
    // Le destinataire doit exister.
    if user::Entity::find_by_id(p.recipient_id)
        .one(&state.db)
        .await?
        .is_none()
    {
        return Err(ApiError::NotFound);
    }

    // Nom de l'expéditeur pour le titre de la notification.
    let sender_name = user::Entity::find_by_id(auth.id())
        .one(&state.db)
        .await?
        .map(|u| u.display_name)
        .unwrap_or_else(|| "Quelqu'un".to_string());

    let clean_body = ammonia::clean(p.body.trim());
    let inserted = message::ActiveModel {
        id: NotSet,
        sender_id: Set(auth.id()),
        recipient_id: Set(p.recipient_id),
        body: Set(clean_body.clone()),
        read: Set(false),
        created_at: Set(Utc::now()),
    }
    .insert(&state.db)
    .await?;

    // Notification push au destinataire (tâche de fond : n'impacte pas la réponse).
    if state.push.enabled() {
        let db = state.db.clone();
        let cfg = state.push.clone();
        let sender_id = auth.id();
        let payload = json!({
            "title": sender_name,
            "body": preview(&clean_body),
            "url": format!("#tab=messages"),
            "tag": format!("msg-{sender_id}"),
        });
        actix_web::rt::spawn(async move {
            crate::push::notify_user(&db, &cfg, p.recipient_id, &payload).await;
        });
    }

    Ok(HttpResponse::Created().json(inserted))
}

/// Aperçu court du message pour le corps d'une notification (≤ 120 caractères).
fn preview(body: &str) -> String {
    let max = 120;
    if body.chars().count() <= max {
        body.to_string()
    } else {
        let mut s: String = body.chars().take(max).collect();
        s.push('…');
        s
    }
}
