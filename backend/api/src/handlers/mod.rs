pub mod accounts;
pub mod admin;
pub mod artworks;
pub mod billing;
pub mod contests;
pub mod featured;
pub mod health;
pub mod marketplace;
pub mod media;
pub mod messages;
pub mod news;
pub mod parts;
pub mod polls;
pub mod push;
pub mod sessions;
pub mod shops;
pub mod riders;
pub mod sounds;
pub mod spots;
pub mod videos;

use serde::Deserialize;

/// Paramètres de pagination communs (`?page=1&per_page=20`).
#[derive(Debug, Deserialize)]
pub struct Pagination {
    #[serde(default = "default_page")]
    pub page: u64,
    #[serde(default = "default_per_page")]
    pub per_page: u64,
}

fn default_page() -> u64 {
    1
}
fn default_per_page() -> u64 {
    20
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            page: 1,
            per_page: 20,
        }
    }
}

impl Pagination {
    /// Page (>=1) et taille bornée à [1, 100].
    pub fn normalized(&self) -> (u64, u64) {
        let page = self.page.max(1);
        let per_page = self.per_page.clamp(1, 100);
        (page, per_page)
    }
}
