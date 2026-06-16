use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("media"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("owner_id")).integer().not_null())
                    .col(ColumnDef::new(Alias::new("kind")).string().not_null())
                    .col(ColumnDef::new(Alias::new("content_type")).string().not_null())
                    .col(ColumnDef::new(Alias::new("filename")).string())
                    .col(ColumnDef::new(Alias::new("byte_size")).big_integer().not_null())
                    .col(ColumnDef::new(Alias::new("data")).binary().not_null())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("media")).if_exists().to_owned())
            .await?;
        Ok(())
    }
}
