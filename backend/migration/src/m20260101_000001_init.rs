use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Raccourcis pour des colonnes récurrentes.
fn col(name: &str) -> ColumnDef {
    ColumnDef::new(Alias::new(name))
}
fn pk() -> ColumnDef {
    col("id").integer().not_null().auto_increment().primary_key().take()
}
fn created() -> ColumnDef {
    col("created_at").timestamp_with_time_zone().not_null().take()
}
fn updated() -> ColumnDef {
    col("updated_at").timestamp_with_time_zone().not_null().take()
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ---------- users ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("users"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("email").string().not_null().unique_key())
                    .col(col("username").string().not_null().unique_key())
                    .col(col("display_name").string().not_null())
                    .col(col("password_hash").string().not_null())
                    .col(col("bio").string())
                    .col(col("avatar_url").string())
                    .col(col("stance").string().not_null().default("unknown"))
                    .col(col("instagram").string())
                    .col(col("city").string())
                    .col(col("role").string().not_null().default("user"))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- sounds ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("sounds"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("user_id").integer().not_null())
                    .col(col("title").string().not_null())
                    .col(col("artist").string())
                    .col(col("audio_url").string().not_null())
                    .col(col("duration_secs").integer().not_null().default(0))
                    .col(col("genre").string())
                    .col(col("downloads_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- parts ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("parts"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("user_id").integer().not_null())
                    .col(col("title").string().not_null())
                    .col(col("video_url").string().not_null())
                    .col(col("thumbnail_url").string())
                    .col(col("sound_id").integer())
                    .col(col("effects").json().not_null())
                    .col(col("duration_secs").integer().not_null().default(0))
                    .col(col("likes_count").integer().not_null().default(0))
                    .col(col("views_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- artworks ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("artworks"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("user_id").integer().not_null())
                    .col(col("title").string().not_null())
                    .col(col("description").string())
                    .col(col("image_url").string().not_null())
                    .col(col("kind").string().not_null().default("drawing"))
                    .col(col("likes_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- contests ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("contests"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("title").string().not_null())
                    .col(col("description").string())
                    .col(col("category").string().not_null())
                    .col(col("starts_at").timestamp_with_time_zone().not_null())
                    .col(col("ends_at").timestamp_with_time_zone().not_null())
                    .col(col("status").string().not_null().default("open"))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- contest_entries ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("contest_entries"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("contest_id").integer().not_null())
                    .col(col("user_id").integer().not_null())
                    .col(col("title").string().not_null())
                    .col(col("content").string())
                    .col(col("image_url").string())
                    .col(col("votes_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- contest_votes (unique entry+user) ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("contest_votes"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("entry_id").integer().not_null())
                    .col(col("user_id").integer().not_null())
                    .col(created())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_contest_votes_unique")
                    .table(Alias::new("contest_votes"))
                    .col(Alias::new("entry_id"))
                    .col(Alias::new("user_id"))
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ---------- spots ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("spots"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("name").string().not_null())
                    .col(col("description").string())
                    .col(col("latitude").double().not_null())
                    .col(col("longitude").double().not_null())
                    .col(col("city").string())
                    .col(col("spot_type").string().not_null().default("street"))
                    .col(col("photo_url").string())
                    .col(col("submitted_by").integer())
                    .col(col("approved").boolean().not_null().default(false))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- polls ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("polls"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("question").string().not_null())
                    .col(col("category").string().not_null().default("free"))
                    .col(col("closed").boolean().not_null().default(false))
                    .col(col("votes_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- poll_options ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("poll_options"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("poll_id").integer().not_null())
                    .col(col("label").string().not_null())
                    .col(col("votes_count").integer().not_null().default(0))
                    .col(col("position").integer().not_null().default(0))
                    .to_owned(),
            )
            .await?;

        // ---------- poll_votes (unique poll+user) ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("poll_votes"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("poll_id").integer().not_null())
                    .col(col("option_id").integer().not_null())
                    .col(col("user_id").integer().not_null())
                    .col(created())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_poll_votes_unique")
                    .table(Alias::new("poll_votes"))
                    .col(Alias::new("poll_id"))
                    .col(Alias::new("user_id"))
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ---------- riders ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("riders"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("name").string().not_null())
                    .col(col("country").string())
                    .col(col("photo_url").string())
                    .col(col("instagram").string())
                    .col(col("bio").string())
                    .col(col("avg_rating").decimal_len(4, 2).not_null().default(0))
                    .col(col("ratings_count").integer().not_null().default(0))
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- rider_ratings (unique rider+user) ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("rider_ratings"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("rider_id").integer().not_null())
                    .col(col("user_id").integer().not_null())
                    .col(col("score").integer().not_null())
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .name("idx_rider_ratings_unique")
                    .table(Alias::new("rider_ratings"))
                    .col(Alias::new("rider_id"))
                    .col(Alias::new("user_id"))
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ---------- news_articles ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("news_articles"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("author_id").integer())
                    .col(col("title").string().not_null())
                    .col(col("slug").string().not_null().unique_key())
                    .col(col("excerpt").string())
                    .col(col("body").text().not_null())
                    .col(col("cover_url").string())
                    .col(col("category").string().not_null().default("news"))
                    .col(col("published").boolean().not_null().default(false))
                    .col(col("published_at").timestamp_with_time_zone())
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        // ---------- featured_accounts ----------
        manager
            .create_table(
                Table::create()
                    .table(Alias::new("featured_accounts"))
                    .if_not_exists()
                    .col(pk())
                    .col(col("handle").string().not_null())
                    .col(col("platform").string().not_null().default("instagram"))
                    .col(col("display_name").string().not_null())
                    .col(col("description").string())
                    .col(col("avatar_url").string())
                    .col(col("period").string().not_null().default("week"))
                    .col(col("featured_from").timestamp_with_time_zone().not_null())
                    .col(col("featured_to").timestamp_with_time_zone().not_null())
                    .col(created())
                    .col(updated())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        for t in [
            "featured_accounts",
            "news_articles",
            "rider_ratings",
            "riders",
            "poll_votes",
            "poll_options",
            "polls",
            "spots",
            "contest_votes",
            "contest_entries",
            "contests",
            "artworks",
            "parts",
            "sounds",
            "users",
        ] {
            manager
                .drop_table(Table::drop().table(Alias::new(t)).if_exists().to_owned())
                .await?;
        }
        Ok(())
    }
}
