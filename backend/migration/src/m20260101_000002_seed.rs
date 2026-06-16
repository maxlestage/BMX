use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::{ConnectionTrait, Statement};

#[derive(DeriveMigrationName)]
pub struct Migration;

fn now() -> SimpleExpr {
    Expr::current_timestamp().into()
}

/// Insère une ligne dans `table` (colonnes/valeurs alignées) et exécute via
/// le backend courant (portable Postgres / SQLite).
async fn insert(
    manager: &SchemaManager<'_>,
    table: &str,
    cols: &[&str],
    vals: Vec<SimpleExpr>,
) -> Result<(), DbErr> {
    let mut stmt = Query::insert();
    stmt.into_table(Alias::new(table))
        .columns(cols.iter().map(|c| Alias::new(*c)))
        .values_panic(vals);
    let backend = manager.get_database_backend();
    let built: Statement = backend.build(&stmt);
    manager.get_connection().execute(built).await?;
    Ok(())
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // -------- Sondages + options --------
        insert(
            manager,
            "polls",
            &["question", "category", "created_at", "updated_at"],
            vec![
                "Quelle taille de board roules-tu ?".into(),
                "board_size".into(),
                now(),
                now(),
            ],
        )
        .await?;
        for (i, label) in ["7.75\"", "8.0\"", "8.25\"", "8.5\"+"].iter().enumerate() {
            insert(
                manager,
                "poll_options",
                &["poll_id", "label", "position"],
                vec![1.into(), (*label).into(), (i as i32).into()],
            )
            .await?;
        }

        insert(
            manager,
            "polls",
            &["question", "category", "created_at", "updated_at"],
            vec![
                "Tes trucks préférés ?".into(),
                "trucks".into(),
                now(),
                now(),
            ],
        )
        .await?;
        for (i, label) in ["Independent", "Thunder", "Venture", "Ace"].iter().enumerate() {
            insert(
                manager,
                "poll_options",
                &["poll_id", "label", "position"],
                vec![2.into(), (*label).into(), (i as i32).into()],
            )
            .await?;
        }

        // -------- Riders du classement --------
        for (name, country, insta) in [
            ("Yuto Horigome", "Japon", "yutohorigome"),
            ("Aurélien Giraud", "France", "aureliengiraud"),
            ("Nyjah Huston", "USA", "nyjah"),
            ("Leticia Bufoni", "Brésil", "leticiabufoni"),
        ] {
            insert(
                manager,
                "riders",
                &["name", "country", "instagram", "created_at", "updated_at"],
                vec![name.into(), country.into(), insta.into(), now(), now()],
            )
            .await?;
        }

        // -------- Quelques spots street --------
        for (name, city, lat, lng, kind) in [
            ("République", "Paris", 48.8674_f64, 2.3636_f64, "plaza"),
            ("Hôtel de Ville", "Lyon", 45.7675, 4.8351, "street"),
            ("Le Prado", "Marseille", 43.2705, 5.3907, "park"),
            ("Place Saint-Pierre", "Bordeaux", 44.8401, -0.5715, "street"),
        ] {
            insert(
                manager,
                "spots",
                &[
                    "name",
                    "city",
                    "latitude",
                    "longitude",
                    "spot_type",
                    "approved",
                    "created_at",
                    "updated_at",
                ],
                vec![
                    name.into(),
                    city.into(),
                    lat.into(),
                    lng.into(),
                    kind.into(),
                    true.into(),
                    now(),
                    now(),
                ],
            )
            .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        let backend = manager.get_database_backend();
        for sql in [
            "DELETE FROM poll_options",
            "DELETE FROM polls",
            "DELETE FROM riders",
            "DELETE FROM spots",
        ] {
            db.execute(Statement::from_string(backend, sql.to_owned()))
                .await?;
        }
        Ok(())
    }
}
