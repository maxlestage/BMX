use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Offre de prix (négociation) sur une annonce marketplace.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "offers")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub listing_id: i32,
    pub user_id: i32,
    /// Montant proposé en centimes d'euro.
    pub amount_cents: i32,
    pub message: Option<String>,
    /// pending | accepted | declined
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
