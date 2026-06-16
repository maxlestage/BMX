use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Part courte (type TikTok) avec effets de montage (VHS, fisheye…).
/// `effects` est un JSON libre : `{ "vhs": true, "fisheye": 0.4, "grain": 0.2 }`.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "parts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub title: String,
    pub video_url: String,
    pub thumbnail_url: Option<String>,
    pub sound_id: Option<i32>,
    pub effects: Json,
    pub duration_secs: i32,
    pub likes_count: i32,
    pub views_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::sound::Entity",
        from = "Column::SoundId",
        to = "super::sound::Column::Id"
    )]
    Sound,
}

impl ActiveModelBehavior for ActiveModel {}
