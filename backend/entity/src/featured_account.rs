use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Compte bmx mis en avant (semaine / mois).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "featured_accounts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub handle: String,
    /// instagram | youtube | tiktok
    pub platform: String,
    pub display_name: String,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
    /// week | month
    pub period: String,
    pub featured_from: DateTime<Utc>,
    pub featured_to: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
