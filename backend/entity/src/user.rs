use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    #[sea_orm(unique)]
    pub email: String,
    #[sea_orm(unique)]
    pub username: String,
    pub display_name: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    /// regular | goofy | unknown
    pub stance: String,
    pub instagram: Option<String>,
    pub city: Option<String>,
    /// user | admin
    pub role: String,
    /// Identifiant client Stripe (créé au 1er paiement).
    pub stripe_customer_id: Option<String>,
    /// Abonnement Stripe en cours.
    pub stripe_subscription_id: Option<String>,
    /// Premium actif tant que cette date est dans le futur.
    pub premium_until: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
