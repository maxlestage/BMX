use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Une réponse possible d'un sondage, avec son compteur de voix.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "poll_options")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub poll_id: i32,
    pub label: String,
    pub votes_count: i32,
    pub position: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::poll::Entity",
        from = "Column::PollId",
        to = "super::poll::Column::Id"
    )]
    Poll,
}

impl Related<super::poll::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Poll.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
