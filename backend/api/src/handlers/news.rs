use actix_web::{get, post, web, HttpResponse};
use chrono::Utc;
use entity::news_article;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, NotSet, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use validator::Validate;

use crate::{
    auth::AuthUser,
    errors::{ApiError, ApiResult},
    handlers::Pagination,
    AppState,
};

/// Slug minimal : minuscules, alphanumérique, tirets.
fn slugify(input: &str) -> String {
    let mut slug = String::with_capacity(input.len());
    let mut prev_dash = false;
    for ch in input.trim().to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            prev_dash = false;
        } else if !prev_dash && !slug.is_empty() {
            slug.push('-');
            prev_dash = true;
        }
    }
    slug.trim_matches('-').to_string()
}

#[get("/news")]
pub async fn index(
    state: web::Data<AppState>,
    page: web::Query<Pagination>,
) -> ApiResult<HttpResponse> {
    let (page, per_page) = page.normalized();
    let items = news_article::Entity::find()
        .filter(news_article::Column::Published.eq(true))
        .order_by_desc(news_article::Column::PublishedAt)
        .paginate(&state.db, per_page)
        .fetch_page(page - 1)
        .await?;
    Ok(HttpResponse::Ok().json(items))
}

#[get("/news/{slug}")]
pub async fn show(state: web::Data<AppState>, slug: web::Path<String>) -> ApiResult<HttpResponse> {
    let item = news_article::Entity::find()
        .filter(news_article::Column::Slug.eq(slug.into_inner()))
        .one(&state.db)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(HttpResponse::Ok().json(item))
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateArticle {
    #[validate(length(min = 1, max = 200))]
    pub title: String,
    pub excerpt: Option<String>,
    #[validate(length(min = 1))]
    pub body: String,
    pub cover_url: Option<String>,
    pub category: Option<String>,
    #[serde(default)]
    pub published: bool,
}

#[post("/news")]
pub async fn create(
    state: web::Data<AppState>,
    auth: AuthUser,
    body: web::Json<CreateArticle>,
) -> ApiResult<HttpResponse> {
    auth.require_admin()?;
    let p = body.into_inner();
    p.validate().map_err(|e| ApiError::BadRequest(e.to_string()))?;

    let now = Utc::now();
    let mut slug = slugify(&p.title);
    if slug.is_empty() {
        slug = format!("article-{}", now.timestamp());
    }
    // Unicité du slug : suffixe horodaté si déjà pris.
    if news_article::Entity::find()
        .filter(news_article::Column::Slug.eq(slug.clone()))
        .one(&state.db)
        .await?
        .is_some()
    {
        slug = format!("{slug}-{}", now.timestamp());
    }

    let inserted = news_article::ActiveModel {
        id: NotSet,
        author_id: Set(Some(auth.id())),
        title: Set(ammonia::clean(p.title.trim())),
        slug: Set(slug),
        excerpt: Set(p.excerpt.map(|e| ammonia::clean(&e))),
        body: Set(ammonia::clean(&p.body)),
        cover_url: Set(p.cover_url),
        category: Set(p.category.unwrap_or_else(|| "news".into())),
        published: Set(p.published),
        published_at: Set(if p.published { Some(now) } else { None }),
        created_at: Set(now),
        updated_at: Set(now),
    }
    .insert(&state.db)
    .await?;
    Ok(HttpResponse::Created().json(inserted))
}
