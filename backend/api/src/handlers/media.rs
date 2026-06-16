use actix_web::{get, post, web, HttpRequest, HttpResponse};
use chrono::Utc;
use entity::media;
use sea_orm::{ActiveModelTrait, EntityTrait, NotSet, Set};
use serde_json::json;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

/// Plafond d'un média : 175 Mo (aligné sur la limite de payload du serveur).
const MAX_BYTES: usize = 175 * 1024 * 1024;

/// Déduit la catégorie à partir du type MIME.
fn kind_from_mime(ct: &str) -> Option<&'static str> {
    if ct.starts_with("image/") {
        Some("image")
    } else if ct.starts_with("video/") {
        Some("video")
    } else if ct.starts_with("audio/") {
        Some("audio")
    } else {
        None
    }
}

/// Upload d'un média (vidéo / photo / audio) stocké en base.
/// Corps = octets bruts du fichier. En-têtes : `Content-Type` (obligatoire,
/// ex. `video/mp4`, `image/jpeg`), `X-Filename` (optionnel).
#[post("/media")]
pub async fn upload(
    state: web::Data<AppState>,
    auth: AuthUser,
    req: HttpRequest,
    body: web::Bytes,
) -> ApiResult<HttpResponse> {
    if body.is_empty() {
        return Err(ApiError::BadRequest("fichier vide".into()));
    }
    // Plafond unique : 175 Mo (les parts sont aussi bornées à 10 s côté client).
    if body.len() > MAX_BYTES {
        let mo = MAX_BYTES / 1024 / 1024;
        return Err(ApiError::BadRequest(format!(
            "fichier trop volumineux (max {mo} Mo)"
        )));
    }

    let content_type = req
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(';').next().unwrap_or(s).trim().to_string())
        .filter(|s| !s.is_empty() && s != "application/octet-stream")
        .ok_or_else(|| ApiError::BadRequest("Content-Type requis (ex. video/mp4)".into()))?;

    let kind = kind_from_mime(&content_type)
        .ok_or_else(|| ApiError::BadRequest("seuls image/, video/ et audio/ sont acceptés".into()))?;

    let filename = req
        .headers()
        .get("x-filename")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let byte_size = body.len() as i64;
    let model = media::ActiveModel {
        id: NotSet,
        owner_id: Set(auth.id()),
        kind: Set(kind.to_string()),
        content_type: Set(content_type.clone()),
        filename: Set(filename),
        byte_size: Set(byte_size),
        data: Set(body.to_vec()),
        created_at: Set(Utc::now()),
    };
    let inserted = model.insert(&state.db).await?;

    Ok(HttpResponse::Created().json(json!({
        "id": inserted.id,
        "url": format!("/api/v1/media/{}", inserted.id),
        "kind": kind,
        "content_type": content_type,
        "byte_size": byte_size,
    })))
}

/// Sert les octets d'un média avec son type MIME.
#[get("/media/{id}")]
pub async fn serve(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = media::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok()
        .content_type(item.content_type.as_str())
        .insert_header(("Cache-Control", "public, max-age=31536000, immutable"))
        .body(item.data))
}

/// Métadonnées d'un média (sans les octets).
#[get("/media/{id}/meta")]
pub async fn meta(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = media::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

/// Résout une référence média : `media_id` (stocké en base) prioritaire,
/// sinon URL externe fournie. Renvoie l'URL finale à stocker.
pub async fn resolve_url(
    state: &AppState,
    media_id: Option<i32>,
    url: Option<String>,
    expected_kind: &str,
) -> ApiResult<String> {
    if let Some(mid) = media_id {
        let m = media::Entity::find_by_id(mid)
            .one(&state.db)
            .await?
            .ok_or_else(|| ApiError::BadRequest(format!("média {mid} introuvable")))?;
        if m.kind != expected_kind {
            return Err(ApiError::BadRequest(format!(
                "le média {mid} est de type {}, attendu {expected_kind}",
                m.kind
            )));
        }
        return Ok(format!("/api/v1/media/{mid}"));
    }
    match url {
        Some(u) if !u.trim().is_empty() => Ok(u),
        _ => Err(ApiError::BadRequest(
            "fournis un media_id (uploadé) ou une URL".into(),
        )),
    }
}
