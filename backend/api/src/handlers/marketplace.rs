use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::{listing, offer, user};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, PaginatorTrait, QueryFilter, QueryOrder,
    Set,
};
use serde::Deserialize;
use serde_json::json;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

use super::Pagination;

const CATEGORIES: &[&str] = &[
    "frame", "bars", "wheels", "cranks", "tires", "apparel", "complete", "other",
];
const CONDITIONS: &[&str] = &["new", "good", "worn"];

/// Profil vendeur/acheteur embarqué dans les réponses marketplace.
fn user_json(u: Option<&user::Model>) -> serde_json::Value {
    json!({
        "id": u.map(|x| x.id),
        "username": u.map(|x| x.username.clone()),
        "display_name": u.map(|x| x.display_name.clone()),
        "avatar_url": u.and_then(|x| x.avatar_url.clone()),
    })
}

/// Annonce sérialisée + champ `seller`.
fn listing_json(l: &listing::Model, seller: Option<&user::Model>) -> ApiResult<serde_json::Value> {
    let mut v = serde_json::to_value(l).map_err(|e| ApiError::Internal(e.to_string()))?;
    if let Some(map) = v.as_object_mut() {
        map.insert("seller".into(), user_json(seller));
    }
    Ok(v)
}

/// Charge en une requête les utilisateurs référencés par `ids`.
async fn users_by_ids(
    db: &sea_orm::DatabaseConnection,
    ids: Vec<i32>,
) -> ApiResult<std::collections::HashMap<i32, user::Model>> {
    if ids.is_empty() {
        return Ok(Default::default());
    }
    let users = user::Entity::find()
        .filter(user::Column::Id.is_in(ids))
        .all(db)
        .await?;
    Ok(users.into_iter().map(|u| (u.id, u)).collect())
}

#[derive(Debug, Deserialize)]
pub struct ListingQuery {
    pub category: Option<String>,
    pub city: Option<String>,
    /// active (défaut) | sold | all
    pub status: Option<String>,
    pub page: Option<u64>,
    pub per_page: Option<u64>,
}

/// Annonces marketplace, des plus récentes aux plus anciennes.
#[get("/listings")]
pub async fn index(
    state: web::Data<AppState>,
    q: web::Query<ListingQuery>,
) -> ApiResult<HttpResponse> {
    let mut query = listing::Entity::find();
    match q.status.as_deref() {
        Some("all") => query = query.filter(listing::Column::Status.ne("removed")),
        Some(s) => query = query.filter(listing::Column::Status.eq(s)),
        None => query = query.filter(listing::Column::Status.eq("active")),
    }
    if let Some(c) = &q.category {
        query = query.filter(listing::Column::Category.eq(c.clone()));
    }
    if let Some(c) = &q.city {
        query = query.filter(listing::Column::City.eq(c.clone()));
    }
    let (page, per_page) = Pagination {
        page: q.page.unwrap_or(1),
        per_page: q.per_page.unwrap_or(30),
    }
    .normalized();
    let items = query
        .order_by_desc(listing::Column::CreatedAt)
        .paginate(&state.db, per_page)
        .fetch_page(page - 1)
        .await?;

    let sellers = users_by_ids(&state.db, items.iter().map(|l| l.user_id).collect()).await?;
    let out: Vec<_> = items
        .iter()
        .map(|l| listing_json(l, sellers.get(&l.user_id)))
        .collect::<ApiResult<_>>()?;
    Ok(HttpResponse::Ok().json(out))
}

#[get("/listings/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let item = listing::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let seller = user::Entity::find_by_id(item.user_id).one(&state.db).await?;
    Ok(HttpResponse::Ok().json(listing_json(&item, seller.as_ref())?))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateListing {
    #[validate(length(min = 1, max = 120))]
    pub title: String,
    #[validate(length(max = 2000))]
    pub description: Option<String>,
    /// Prix demandé en centimes (0 = donné).
    #[validate(range(min = 0, max = 10_000_000))]
    pub price_cents: i32,
    pub category: String,
    pub condition: String,
    pub city: Option<String>,
    /// Galerie de photos (URLs), jusqu'à 8.
    #[serde(default)]
    pub photos: Vec<String>,
}

/// Publie une annonce.
#[post("/listings")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateListing>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    if !CATEGORIES.contains(&p.category.as_str()) {
        return Err(ApiError::BadRequest("catégorie inconnue".into()));
    }
    if !CONDITIONS.contains(&p.condition.as_str()) {
        return Err(ApiError::BadRequest("état inconnu".into()));
    }
    let mut photos: Vec<String> = Vec::new();
    for url in &p.photos {
        let u = url.trim().to_string();
        if !u.is_empty() && !photos.contains(&u) {
            photos.push(u);
        }
    }
    photos.truncate(8);

    let now = Utc::now();
    let inserted = listing::ActiveModel {
        id: NotSet,
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        description: Set(p.description.map(|d| ammonia::clean(d.trim()))),
        price_cents: Set(p.price_cents),
        category: Set(p.category),
        condition: Set(p.condition),
        city: Set(p.city.map(|c| ammonia::clean(c.trim()))),
        photos: Set(serde_json::json!(photos)),
        status: Set("active".into()),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;
    Ok(HttpResponse::Created().json(inserted))
}

/// Change le statut d'une annonce (vendeur : sold/active/removed ; admin : removed).
async fn set_status(
    state: &AppState,
    auth: &AuthUser,
    id: i32,
    status: &str,
) -> ApiResult<listing::Model> {
    let item = listing::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if item.user_id != auth.id() && !(auth.is_admin() && status == "removed") {
        return Err(ApiError::Forbidden);
    }
    let mut m: listing::ActiveModel = item.into();
    m.status = Set(status.to_string());
    m.updated_at = Set(Utc::now());
    Ok(m.update(&state.db).await?)
}

/// Marque une annonce comme vendue (vendeur).
#[post("/listings/{id}/sold")]
pub async fn mark_sold(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let updated = set_status(&state, &auth, id.into_inner(), "sold").await?;
    Ok(HttpResponse::Ok().json(updated))
}

/// Retire une annonce (vendeur ou admin).
#[post("/listings/{id}/remove")]
pub async fn remove(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let updated = set_status(&state, &auth, id.into_inner(), "removed").await?;
    Ok(HttpResponse::Ok().json(updated))
}

/// Offres reçues sur une annonce (vendeur uniquement).
#[get("/listings/{id}/offers")]
pub async fn offers(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let item = listing::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if item.user_id != auth.id() {
        return Err(ApiError::Forbidden);
    }
    let offers = offer::Entity::find()
        .filter(offer::Column::ListingId.eq(item.id))
        .order_by_desc(offer::Column::CreatedAt)
        .all(&state.db)
        .await?;
    let buyers = users_by_ids(&state.db, offers.iter().map(|o| o.user_id).collect()).await?;
    let out: Vec<_> = offers
        .iter()
        .map(|o| {
            let mut v = serde_json::to_value(o).map_err(|e| ApiError::Internal(e.to_string()))?;
            if let Some(map) = v.as_object_mut() {
                map.insert("buyer".into(), user_json(buyers.get(&o.user_id)));
            }
            Ok(v)
        })
        .collect::<ApiResult<_>>()?;
    Ok(HttpResponse::Ok().json(out))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOffer {
    #[validate(range(min = 0, max = 10_000_000))]
    pub amount_cents: i32,
    #[validate(length(max = 500))]
    pub message: Option<String>,
}

/// Fait une offre sur une annonce active (négociation).
#[post("/listings/{id}/offers")]
pub async fn make_offer(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
    body: web::Json<CreateOffer>,
) -> ApiResult<HttpResponse> {
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    let item = listing::Entity::find_by_id(id.into_inner())
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if item.user_id == auth.id() {
        return Err(ApiError::BadRequest("impossible d'enchérir sur sa propre annonce".into()));
    }
    if item.status != "active" {
        return Err(ApiError::Conflict("cette annonce n'est plus disponible".into()));
    }

    let inserted = offer::ActiveModel {
        id: NotSet,
        listing_id: Set(item.id),
        user_id: Set(auth.id()),
        amount_cents: Set(p.amount_cents),
        message: Set(p.message.map(|m| ammonia::clean(m.trim()))),
        status: Set("pending".into()),
        created_at: Set(Utc::now()),
    }
    .insert(&state.db)
    .await?;

    // Notifie le vendeur (tâche de fond).
    if state.push.enabled() {
        let db = state.db.clone();
        let cfg = state.push.clone();
        let seller_id = item.user_id;
        let payload = json!({
            "title": "Nouvelle offre 💰",
            "body": format!("{:.2} € sur « {} »", p.amount_cents as f64 / 100.0, item.title),
            "url": "#tab=market",
            "tag": format!("offer-{}", item.id),
        });
        actix_web::rt::spawn(async move {
            crate::push::notify_user(&db, &cfg, seller_id, &payload).await;
        });
    }

    Ok(HttpResponse::Created().json(inserted))
}

/// Accepte ou refuse une offre (vendeur). Accepter passe l'annonce en `sold`.
async fn answer_offer(
    state: &AppState,
    auth: &AuthUser,
    offer_id: i32,
    accept: bool,
) -> ApiResult<offer::Model> {
    let o = offer::Entity::find_by_id(offer_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let item = listing::Entity::find_by_id(o.listing_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if item.user_id != auth.id() {
        return Err(ApiError::Forbidden);
    }
    if o.status != "pending" {
        return Err(ApiError::Conflict("offre déjà traitée".into()));
    }

    let buyer_id = o.user_id;
    let amount = o.amount_cents;
    let mut m: offer::ActiveModel = o.into();
    m.status = Set(if accept { "accepted" } else { "declined" }.to_string());
    let updated = m.update(&state.db).await?;

    if accept {
        let mut lm: listing::ActiveModel = item.clone().into();
        lm.status = Set("sold".into());
        lm.updated_at = Set(Utc::now());
        lm.update(&state.db).await?;
    }

    // Notifie l'acheteur (tâche de fond).
    if state.push.enabled() {
        let db = state.db.clone();
        let cfg = state.push.clone();
        let payload = json!({
            "title": if accept { "Offre acceptée ✅" } else { "Offre refusée" },
            "body": format!("{:.2} € — « {} »", amount as f64 / 100.0, item.title),
            "url": "#tab=market",
            "tag": format!("offer-{}", item.id),
        });
        actix_web::rt::spawn(async move {
            crate::push::notify_user(&db, &cfg, buyer_id, &payload).await;
        });
    }

    Ok(updated)
}

#[post("/offers/{id}/accept")]
pub async fn accept_offer(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let updated = answer_offer(&state, &auth, id.into_inner(), true).await?;
    Ok(HttpResponse::Ok().json(updated))
}

#[post("/offers/{id}/decline")]
pub async fn decline_offer(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let updated = answer_offer(&state, &auth, id.into_inner(), false).await?;
    Ok(HttpResponse::Ok().json(updated))
}
