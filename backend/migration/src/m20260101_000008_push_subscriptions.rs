use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("push_subscriptions"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("user_id")).integer().not_null())
                    .col(
                        ColumnDef::new(Alias::new("endpoint"))
                            .string()
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Alias::new("p256dh")).string().not_null())
                    .col(ColumnDef::new(Alias::new("auth")).string().not_null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_push_subscriptions_user")
                    .table(Alias::new("push_subscriptions"))
                    .col(Alias::new("user_id"))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(Alias::new("push_subscriptions"))
                    .if_exists()
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}
