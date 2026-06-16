use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Session de bmx : rendez-vous proposé par un membre (spot ou ville).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "bmx_sessions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// Organisateur.
    pub user_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub city: Option<String>,
    /// Spot de la carte (optionnel).
    pub spot_id: Option<i32>,
    pub starts_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
