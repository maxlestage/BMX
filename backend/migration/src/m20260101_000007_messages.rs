use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("messages"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("sender_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("recipient_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("body")).string().not_null())
                    .col(ColumnDef::new(Alias::new("read")).boolean().not_null().default(false))
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
                    .name("idx_messages_pair")
                    .table(Alias::new("messages"))
                    .col(Alias::new("sender_id"))
                    .col(Alias::new("recipient_id"))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("messages")).if_exists().to_owned())
            .await?;
        Ok(())
    }
}
