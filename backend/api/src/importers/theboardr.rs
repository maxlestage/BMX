//! Import des riders depuis theboardr.com.
//!
//! L'API publique (api.theboardr.com) renvoie 503, mais les pages sont rendues
//! côté serveur et contiennent des liens de profil normalisés :
//!   https://theboardr.com/profile/{id}/{Nom_Avec_Underscores}
//! La photo suit un motif déterministe sur leur blob Azure :
//!   https://theboardr.blob.core.windows.net/headshots/{id}thumb.jpg

use std::collections::BTreeMap;

use anyhow::Result;
use chrono::Utc;
use entity::rider;
use regex::Regex;
use rust_decimal::Decimal;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, NotSet, QueryFilter, Set,
};

const SOURCE: &str = "theboardr";
const PAGES: &[&str] = &[
    "https://www.theboardr.com/riders",
    "https://www.theboardr.com/",
];

fn photo_url(id: &str) -> String {
    format!("https://theboardr.blob.core.windows.net/headshots/{id}thumb.jpg")
}

/// Récupère les pages, en extrait les riders uniques, puis upsert en base.
pub async fn import(db: &DatabaseConnection, client: &reqwest::Client) -> Result<usize> {
    let re = Regex::new(r#"theboardr\.com/profile/(\d+)/([^"\s<>]+)"#)?;

    // id -> nom (dédupliqué, ordre stable).
    let mut found: BTreeMap<String, String> = BTreeMap::new();
    for url in PAGES {
        let body = match client.get(*url).send().await {
            Ok(r) => r.text().await.unwrap_or_default(),
            Err(e) => {
                tracing::warn!("theboardr: {url} injoignable: {e}");
                continue;
            }
        };
        for cap in re.captures_iter(&body) {
            let id = cap[1].to_string();
            let name = cap[2].replace('_', " ");
            let name = name.trim();
            if name.is_empty() || name.len() > 120 {
                continue;
            }
            found.entry(id).or_insert_with(|| name.to_string());
        }
    }

    if found.is_empty() {
        anyhow::bail!("aucun rider trouvé (structure de page modifiée ?)");
    }

    let now = Utc::now();
    let mut count = 0usize;
    for (id, name) in found {
        let existing = rider::Entity::find()
            .filter(rider::Column::Source.eq(SOURCE))
            .filter(rider::Column::ExternalId.eq(id.clone()))
            .one(db)
            .await?;
        match existing {
            Some(row) => {
                let mut m: rider::ActiveModel = row.into();
                m.name = Set(name);
                m.photo_url = Set(Some(photo_url(&id)));
                m.updated_at = Set(now);
                m.update(db).await?;
            }
            None => {
                rider::ActiveModel {
                    id: NotSet,
                    name: Set(name),
                    source: Set(SOURCE.into()),
                    external_id: Set(Some(id.clone())),
                    country: Set(None),
                    photo_url: Set(Some(photo_url(&id))),
                    instagram: Set(None),
                    bio: Set(None),
                    avg_rating: Set(Decimal::ZERO),
                    ratings_count: Set(0),
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
