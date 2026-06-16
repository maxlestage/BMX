use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Proposition soumise à un concours.
/// `content` sert pour les noms de marque ; `image_url` pour logos / bmxparks.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contest_entries")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub contest_id: i32,
    pub user_id: i32,
    pub title: String,
    pub content: Option<String>,
    pub image_url: Option<String>,
    pub votes_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::contest::Entity",
        from = "Column::ContestId",
        to = "super::contest::Column::Id"
    )]
    Contest,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
}

impl Related<super::contest::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Contest.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
