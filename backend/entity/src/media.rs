use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Média binaire stocké directement en base (vidéos, photos, audio).
/// Servi via `GET /api/v1/media/{id}`. Les octets ne sont jamais sérialisés en JSON.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "media")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub owner_id: i32,
    /// image | video | audio
    pub kind: String,
    pub content_type: String,
    pub filename: Option<String>,
    pub byte_size: i64,
    #[serde(skip_serializing)]
    pub data: Vec<u8>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
