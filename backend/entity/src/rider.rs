use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Rider du classement international, noté par la communauté française.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "riders")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub name: String,
    /// Provenance : "manual" (admin) ou "theboardr" (import).
    pub source: String,
    /// Identifiant chez la source (ex. id de profil theboardr) pour l'upsert.
    pub external_id: Option<String>,
    pub country: Option<String>,
    pub photo_url: Option<String>,
    pub instagram: Option<String>,
    pub bio: Option<String>,
    /// Moyenne des notes (0.00 à 10.00), recalculée à chaque vote.
    #[sea_orm(column_type = "Decimal(Some((4, 2)))")]
    pub avg_rating: Decimal,
    pub ratings_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::rider_rating::Entity")]
    Ratings,
}

impl Related<super::rider_rating::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Ratings.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
