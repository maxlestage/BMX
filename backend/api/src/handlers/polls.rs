use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::{poll, poll_option, poll_vote};
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

/// Charge un sondage avec ses options triées.
async fn poll_with_options(
    db: &sea_orm::DatabaseConnection,
    id: i32,
) -> ApiResult<serde_json::Value> {
    let p = poll::Entity::find_by_id(id)
        .one(db)
        .await?
        .ok_or(ApiError::NotFound)?;
    let options = poll_option::Entity::find()
        .filter(poll_option::Column::PollId.eq(id))
        .order_by_asc(poll_option::Column::Position)
        .all(db)
        .await?;
    Ok(json!({ "poll": p, "options": options }))
}

#[get("/polls")]
pub async fn index(state: web::Data<AppState>) -> ApiResult<HttpResponse> {
    let polls = poll::Entity::find()
        .order_by_desc(poll::Column::CreatedAt)
        .all(&state.db)
        .await?;
    let mut out = Vec::with_capacity(polls.len());
    for p in polls {
        let options = poll_option::Entity::find()
            .filter(poll_option::Column::PollId.eq(p.id))
            .order_by_asc(poll_option::Column::Position)
            .all(&state.db)
            .await?;
        out.push(json!({ "poll": p, "options": options }));
    }
    Ok(HttpResponse::Ok().json(out))
}

#[get("/polls/{id}")]
pub async fn show(state: web::Data<AppState>, id: web::Path<i32>) -> ApiResult<HttpResponse> {
    Ok(HttpResponse::Ok().json(poll_with_options(&state.db, id.into_inner()).await?))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePoll {
    #[validate(length(min = 1, max = 200))]
    pub question: String,
    pub category: Option<String>,
    #[validate(length(min = 2, max = 12))]
    pub options: Vec<String>,
}

#[post("/polls")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreatePoll>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let now = Utc::now();
    let inserted = poll::ActiveModel {
        id: NotSet,
        question: Set(ammonia::clean(p.question.trim())),
        category: Set(p.category.unwrap_or_else(|| "free".into())),
        closed: Set(false),
        votes_count: Set(0),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;

    for (i, label) in p.options.iter().enumerate() {
        poll_option::ActiveModel {
            id: NotSet,
            poll_id: Set(inserted.id),
            label: Set(ammonia::clean(label.trim())),
            votes_count: Set(0),
            position: Set(i as i32),
        }
        .insert(&state.db)
        .await?;
    }

    Ok(HttpResponse::Created().json(poll_with_options(&state.db, inserted.id).await?))
}

#[derive(Debug, Deserialize)]
pub struct VotePayload {
    pub option_id: i32,
}

#[post("/polls/{id}/vote")]
pub async fn vote(
    state: web::Data<AppState>,
    auth: AuthUser,
    id: web::Path<i32>,
    body: web::Json<VotePayload>,
) -> ApiResult<HttpResponse> {
    let poll_id = id.into_inner();
    let option_id = body.into_inner().option_id;

    let poll_row = poll::Entity::find_by_id(poll_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if poll_row.closed {
        return Err(ApiError::BadRequest("sondage clôturé".into()));
    }

    // L'option doit appartenir au sondage.
    let option = poll_option::Entity::find_by_id(option_id)
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    if option.poll_id != poll_id {
        return Err(ApiError::BadRequest("option hors sondage".into()));
    }

    // Un seul vote par (poll, user).
    let already = poll_vote::Entity::find()
        .filter(poll_vote::Column::PollId.eq(poll_id))
        .filter(poll_vote::Column::UserId.eq(auth.id()))
        .one(&state.db)
        .await?;
    if already.is_some() {
        return Err(ApiError::Conflict("tu as déjà voté à ce sondage".into()));
    }

    poll_vote::ActiveModel {
        id: NotSet,
        poll_id: Set(poll_id),
        option_id: Set(option_id),
        user_id: Set(auth.id()),
        created_at: Set(Utc::now()),
    }
    .insert(&state.db)
    .await?;

    let mut opt: poll_option::ActiveModel = option.into();
    let next = opt.votes_count.take().unwrap_or(0) + 1;
    opt.votes_count = Set(next);
    opt.update(&state.db).await?;

    let mut pm: poll::ActiveModel = poll_row.into();
    let total = pm.votes_count.take().unwrap_or(0) + 1;
    pm.votes_count = Set(total);
    pm.updated_at = Set(Utc::now());
    pm.update(&state.db).await?;

    Ok(HttpResponse::Ok().json(poll_with_options(&state.db, poll_id).await?))
}
