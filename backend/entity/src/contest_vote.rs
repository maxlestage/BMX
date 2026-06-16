use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Un vote d'un utilisateur pour une proposition. Unicité (entry_id, user_id).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contest_votes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub entry_id: i32,
    pub user_id: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::contest_entry::Entity",
        from = "Column::EntryId",
        to = "super::contest_entry::Column::Id"
    )]
    Entry,
}

impl ActiveModelBehavior for ActiveModel {}
