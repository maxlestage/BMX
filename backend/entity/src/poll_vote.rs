use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Vote d'un utilisateur dans un sondage. Unicité (poll_id, user_id).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "poll_votes")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub poll_id: i32,
    pub option_id: i32,
    pub user_id: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
