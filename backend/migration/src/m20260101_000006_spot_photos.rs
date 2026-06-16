use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Liste de photos d'un spot (URLs), en plus de photo_url (couverture).
        // JSON pour rester portable Postgres/SQLite. Défaut : tableau vide.
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("spots"))
                    .add_column(
                        ColumnDef::new(Alias::new("photos"))
                            .json()
                            .not_null()
                            .default("[]"),
                    )
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("spots"))
                    .drop_column(Alias::new("photos"))
                    .to_owned(),
            )
            .await
            .ok();
        Ok(())
    }
}
