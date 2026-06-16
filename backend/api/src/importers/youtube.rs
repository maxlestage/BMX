//! Import des dernières vidéos depuis le flux YouTube officiel de Thrasher.
//! Le site thrashermagazine.com bloque les bots (403) ; le flux RSS de la
//! chaîne YouTube est la source propre et fiable.

use anyhow::Result;
use chrono::{DateTime, Utc};
use entity::video;
use regex::Regex;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, NotSet, QueryFilter, Set,
};

const SOURCE: &str = "thrasher_youtube";
const DEFAULT_FEED: &str = "https://www.youtube.com/feeds/videos.xml?user=ThrasherMagazine";

fn feed_url() -> String {
    std::env::var("THRASHER_YT_FEED").unwrap_or_else(|_| DEFAULT_FEED.to_string())
}

/// Décode les entités XML courantes d'un titre.
fn unescape(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn cap1(re: &Regex, hay: &str) -> Option<String> {
    re.captures(hay).map(|c| c[1].to_string())
}

pub async fn import(db: &DatabaseConnection, client: &reqwest::Client) -> Result<usize> {
    let body = client.get(feed_url()).send().await?.text().await?;

    let re_id = Regex::new(r"<yt:videoId>([^<]+)</yt:videoId>")?;
    let re_title = Regex::new(r"<title>([^<]*)</title>")?;
    let re_pub = Regex::new(r"<published>([^<]+)</published>")?;
    let re_thumb = Regex::new(r#"<media:thumbnail[^>]*url="([^"]+)""#)?;
    let re_author = Regex::new(r"<name>([^<]+)</name>")?;

    let now = Utc::now();
    let mut count = 0usize;
    // Le flux commence par un <title> de chaîne ; on ne traite que les <entry>.
    for chunk in body.split("<entry>").skip(1) {
        let Some(id) = cap1(&re_id, chunk) else { continue };
        let title = cap1(&re_title, chunk).map(|t| unescape(&t)).unwrap_or_default();
        if title.is_empty() {
            continue;
        }
        let thumbnail = cap1(&re_thumb, chunk);
        let author = cap1(&re_author, chunk).map(|a| unescape(&a));
        let published = cap1(&re_pub, chunk)
            .and_then(|p| DateTime::parse_from_rfc3339(p.trim()).ok())
            .map(|d| d.with_timezone(&Utc));
        let url = format!("https://www.youtube.com/watch?v={id}");

        let existing = video::Entity::find()
            .filter(video::Column::Source.eq(SOURCE))
            .filter(video::Column::ExternalId.eq(id.clone()))
            .one(db)
            .await?;
        match existing {
            Some(row) => {
                let mut m: video::ActiveModel = row.into();
                m.title = Set(title);
                m.url = Set(url);
                m.thumbnail_url = Set(thumbnail);
                m.author = Set(author);
                m.published_at = Set(published);
                m.updated_at = Set(now);
                m.update(db).await?;
            }
            None => {
                video::ActiveModel {
                    id: NotSet,
                    source: Set(SOURCE.into()),
                    external_id: Set(id.clone()),
                    title: Set(title),
                    url: Set(url),
                    thumbnail_url: Set(thumbnail),
                    author: Set(author),
                    published_at: Set(published),
                    created_at: Set(now),
                    updated_at: Set(now),
                }
                .insert(db)
                .await?;
            }
        }
        count += 1;
    }
    Ok(count)
}
