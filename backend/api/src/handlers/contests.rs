use actix_web::{get, post, web, HttpResponse};
use chrono::{DateTime, Utc};
use entity::{contest, contest_entry, contest_vote};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use serde_json::json;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    AppState,
};

#[get("/contests")]
pub async fn index(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let items = contest::Entity::find()
        .order_by_desc(contest::Column::CreatedAt)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/contests/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    let id = id.into_inner();
    let item = contest::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let entries = contest_entry::Entity::find()
        .filter(contest_entry::Column::ContestId.eq(id))
        .order_by_desc(contest_entry::Column::VotesCount)
        .all(&state.db)
        .await?;
    Ok(HttpResponse::Ok().json(json!({ "contest": item, "entries": entries })))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateContest {
    #[validate(length(min = 1, max = 140))]
    pub title: String,
    pub description: Option<String>,
    /// bmxpark | logo | brand_name
    pub category: String,
    pub starts_at: DateTime<Utc>,
    pub ends_at: DateTime<Utc>,
}

#[post("/contests")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateContest>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;
    if !matches!(p.category.as_str(), "bmxpark" | "logo" | "brand_name") {
        return Err(ApiError::BadRequest("catégorie invalide".into()));
    }
    let now = Utc::now();
    let model = contest::ActiveModel {
        id: NotSet,
        title: Set(ammonia::clean(p.title.trim())),
        description: Set(p.description.map(|d| ammonia::clean(&d))),
        category: Set(p.category),
        starts_at: Set(p.starts_at),
        ends_at: Set(p.ends_at),
        status: Set("open".into()),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

#[derive(Debug, Deserialize, Validate)]
pub struct SubmitEntry {
    #[validate(length(min = 1, max = 140))]
    pub title: String,
    pub content: Option<String>,
    pub image_url: Option<String>,
}

#[post("/contests/{id}/entries")]
pub async fn submit_entry(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
    body: web::Json<SubmitEntry>,
) -> ApiResult<HttpResponse> {
    let contest_id = id.into_inner();
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let contest = contest::Entity::find_by_id(contest_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if contest.status == "closed" {
        return Err(ApiError::BadRequest("concours clôturé".into()));
    }

    let now = Utc::now();
    let model = contest_entry::ActiveModel {
        id: NotSet,
        contest_id: Set(contest_id),
        user_id: Set(auth.id()),
        title: Set(ammonia::clean(p.title.trim())),
        content: Set(p.content.map(|c| ammonia::clean(&c))),
        image_url: Set(p.image_url),
        votes_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    };
    let inserted = model.insert(&state.db).await?;
    Ok(HttpResponse::Created().json(inserted))
}

#[post("/contests/entries/{entry_id}/vote")]
pub async fn vote(
    state: web::Data<AppState>,
    auth: AuthUser,
    entry_id: web::Path<i32>,
) -> ApiResult<HttpResponse> {
    let entry_id = entry_id.into_inner();
    let entry = contest_entry::Entity::find_by_id(entry_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;

    // Un seul vote par (entry, user).
    let already = contest_vote::Entity::find()
        .filter(contest_vote::Column::EntryId.eq(entry_id))
        .filter(contest_vote::Column::UserId.eq(auth.id()))
        .one(&state.db)
        .await?;
    if already.is_some() {
        return Err(ApiError::Conflict("tu as déjà voté pour cette proposition".into()));
    }

    contest_vote::ActiveModel {
        id: NotSet,
        entry_id: Set(entry_id),
        user_id: Set(auth.id()),
        created_at: Set(Utc::now()),
    }
    .insert(&state.db)
    .await?;

    let mut m: contest_entry::ActiveModel = entry.into();
    let next = m.votes_count.take().unwrap_or(0) + 1;
    m.votes_count = Set(next);
    m.updated_at = Set(Utc::now());
    let updated = m.update(&state.db).await?;
    Ok(HttpResponse::Ok().json(updated))
}
