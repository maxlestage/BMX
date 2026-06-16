use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Vidéo externe agrégée (ex. chaîne YouTube de Thrasher), rafraîchie par cron.
/// Unicité logique : (source, external_id).
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "videos")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    /// ex. "thrasher_youtube"
    pub source: String,
    /// Identifiant chez la source (ex. id de vidéo YouTube).
    pub external_id: String,
    pub title: String,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub author: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
