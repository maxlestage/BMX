use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Sondage communautaire (taille de board, trucks préférés…).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "polls")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub question: String,
    /// board_size | trucks | wheels | shoes | stance | free
    pub category: String,
    pub closed: bool,
    pub votes_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::poll_option::Entity")]
    Options,
}

impl Related<super::poll_option::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Options.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
