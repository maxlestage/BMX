use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // --- riders : champs d'import idempotent --------------------------
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("riders"))
                    .add_column(
                        ColumnDef::new(Alias::new("source"))
                            .string()
                            .not_null()
                            .default("manual"),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("riders"))
                    .add_column(ColumnDef::new(Alias::new("external_id")).string())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_riders_source_ext")
                    .table(Alias::new("riders"))
                    .col(Alias::new("source"))
                    .col(Alias::new("external_id"))
                    .unique()
                    .to_owned(),
            )
            .await?;

        // --- videos : vidéos externes (YouTube Thrasher…) ------------------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("videos"))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Alias::new("id"))
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Alias::new("source")).string().not_null())
                    .col(ColumnDef::new(Alias::new("external_id")).string().not_null())
                    .col(ColumnDef::new(Alias::new("title")).string().not_null())
                    .col(ColumnDef::new(Alias::new("url")).string().not_null())
                    .col(ColumnDef::new(Alias::new("thumbnail_url")).string())
                    .col(ColumnDef::new(Alias::new("author")).string())
                    .col(ColumnDef::new(Alias::new("published_at")).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Alias::new("created_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Alias::new("updated_at"))
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_videos_source_ext")
                    .table(Alias::new("videos"))
                    .col(Alias::new("source"))
                    .col(Alias::new("external_id"))
                    .unique()
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Alias::new("videos")).if_exists().to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx_riders_source_ext").to_owned())
            .await
            .ok();
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("riders"))
                    .drop_column(Alias::new("external_id"))
                    .to_owned(),
            )
            .await
            .ok();
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("riders"))
                    .drop_column(Alias::new("source"))
                    .to_owned(),
            )
            .await
            .ok();
        Ok(())
    }
}
