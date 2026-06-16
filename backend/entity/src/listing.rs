use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Annonce marketplace : matos de bmx vendu entre membres.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "listings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub user_id: i32,
    pub title: String,
    pub description: Option<String>,
    /// Prix demandé en centimes d'euro.
    pub price_cents: i32,
    /// deck | trucks | wheels | shoes | apparel | complete | other
    pub category: String,
    /// new | good | worn
    pub condition: String,
    pub city: Option<String>,
    /// Galerie de photos (URLs), JSON array.
    pub photos: Json,
    /// active | sold | removed
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
