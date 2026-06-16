use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for col in ["stripe_customer_id", "stripe_subscription_id"] {
            manager
                .alter_table(
                    Table::alter()
                        .table(Alias::new("users"))
                        .add_column(ColumnDef::new(Alias::new(col)).string())
                        .to_owned(),
                )
                .await?;
        }
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("users"))
                    .add_column(
                        ColumnDef::new(Alias::new("premium_until")).timestamp_with_time_zone(),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for col in ["stripe_customer_id", "stripe_subscription_id", "premium_until"] {
            manager
                .alter_table(
                    Table::alter()
                        .table(Alias::new("users"))
                        .drop_column(Alias::new(col))
                        .to_owned(),
                )
                .await
                .ok();
        }
        Ok(())
    }
}
