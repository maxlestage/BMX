use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Article de news bmx (façon « la BMXerie »).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "news_articles")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub author_id: Option<i32>,
    pub title: String,
    #[sea_orm(unique)]
    pub slug: String,
    pub excerpt: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub body: String,
    pub cover_url: Option<String>,
    /// news | contest | spot | interview | edit
    pub category: String,
    pub published: bool,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
