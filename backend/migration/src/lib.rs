pub use sea_orm_migration::prelude::*;

mod m20260101_000001_init;
mod m20260101_000002_seed;
mod m20260101_000003_media;
mod m20260101_000004_import;
mod m20260101_000005_billing;
mod m20260101_000006_spot_photos;
mod m20260101_000007_messages;
mod m20260101_000008_push_subscriptions;
mod m20260101_000009_marketplace;
mod m20260101_000010_seed_shops;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260101_000001_init::Migration),
            Box::new(m20260101_000002_seed::Migration),
            Box::new(m20260101_000003_media::Migration),
            Box::new(m20260101_000004_import::Migration),
            Box::new(m20260101_000005_billing::Migration),
            Box::new(m20260101_000006_spot_photos::Migration),
            Box::new(m20260101_000007_messages::Migration),
            Box::new(m20260101_000008_push_subscriptions::Migration),
            Box::new(m20260101_000009_marketplace::Migration),
            Box::new(m20260101_000010_seed_shops::Migration),
        ]
    }
}
