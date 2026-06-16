use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Note (1 à 10) donnée par un utilisateur à un rider. Unicité (rider_id, user_id).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "rider_ratings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub rider_id: i32,
    pub user_id: i32,
    pub score: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::rider::Entity",
        from = "Column::RiderId",
        to = "super::rider::Column::Id"
    )]
    Rider,
}

impl Related<super::rider::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Rider.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
