//! Imports externes rafraîchis périodiquement (cron intégré, tâche tokio) :
//!   - riders depuis theboardr.com (scraping des pages, API publique HS)
//!   - vidéos depuis le flux YouTube officiel de Thrasher
//!
//! Pilotage par variables d'environnement :
//!   IMPORT_ENABLED         (défaut: true)
//!   IMPORT_INTERVAL_HOURS  (défaut: 6)   — fréquence du rafraîchissement
//!   IMPORT_ON_BOOT         (défaut: true) — un import ~15 s après le démarrage

pub mod theboardr;
pub mod youtube;

use std::time::Duration;

use sea_orm::DatabaseConnection;

/// Client HTTP partagé (User-Agent poli, timeouts).
pub fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent("bmx-rider/1.0 (+https://bmx.bike)")
        .timeout(Duration::from_secs(30))
        .build()
        .expect("client http")
}

/// Lance un cycle complet d'import (chaque source isolée des erreurs de l'autre).
pub async fn run_all(db: &DatabaseConnection) {
    let client = http_client();

    match theboardr::import(db, &client).await {
        Ok(n) => tracing::info!("import theboardr : {n} riders à jour"),
        Err(e) => tracing::warn!("import theboardr échoué : {e}"),
    }
    match youtube::import(db, &client).await {
        Ok(n) => tracing::info!("import vidéos Thrasher : {n} vidéos à jour"),
        Err(e) => tracing::warn!("import vidéos échoué : {e}"),
    }
}

fn env_bool(key: &str, default: bool) -> bool {
    std::env::var(key)
        .ok()
        .map(|v| matches!(v.trim().to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(default)
}

/// Démarre la tâche de fond de rafraîchissement. Ne bloque pas.
pub fn spawn_scheduler(db: DatabaseConnection) {
    if !env_bool("IMPORT_ENABLED", true) {
        tracing::info!("imports désactivés (IMPORT_ENABLED=false)");
        return;
    }
    let hours: u64 = std::env::var("IMPORT_INTERVAL_HOURS")
        .ok()
        .and_then(|v| v.parse().ok())
        .filter(|h| *h >= 1)
        .unwrap_or(6);
    let on_boot = env_bool("IMPORT_ON_BOOT", true);

    tokio::spawn(async move {
        if on_boot {
            // Laisse le serveur démarrer avant le premier import.
            tokio::time::sleep(Duration::from_secs(15)).await;
            run_all(&db).await;
        }
        let mut tick = tokio::time::interval(Duration::from_secs(hours * 3600));
        // Le premier tick est immédiat : on le consomme pour respecter l'intervalle.
        tick.tick().await;
        loop {
            tick.tick().await;
            run_all(&db).await;
        }
    });
    tracing::info!("scheduler d'imports actif (toutes les {hours} h)");
}
