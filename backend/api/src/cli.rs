//! Commandes d'administration en ligne de commande.
//!
//! Le binaire `api` bascule en mode CLI dès que le premier argument contient un
//! `:` (ex. `api db:reset`). Sinon il démarre le serveur HTTP normalement.
//!
//! Commandes disponibles :
//!   db:reset                                  ⚠️ efface TOUTES les tables puis recrée
//!   admin:create <email> <motdepasse>         crée (ou promeut) un compte admin
//!   seed:users  <nombre>                       crée N profils de riders (photos via proxy)
//!   seed:matches <email> <convos> <messages>   remplit les conversations d'un compte
//!
//! Note domaine : « bmx » est une app de bmx, il n'y a pas de « match »
//! ni de like entre utilisateurs comme dans une app de rencontres. `seed:matches`
//! est donc adapté : il sème des conversations/messages (l'interaction sociale
//! réelle entre comptes) pour l'email donné.

use anyhow::{anyhow, bail, Context, Result};
use chrono::{Duration, Utc};
use entity::{message, user};
use migration::{Migrator, MigratorTrait};
use rand::seq::SliceRandom;
use rand::Rng;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, Database, DatabaseConnection, EntityTrait, NotSet, QueryFilter,
    QuerySelect, Set,
};

const USAGE: &str = "\
Commandes :
  db:reset                                   ⚠️  efface TOUTES les tables puis recrée
  admin:create <email> <motdepasse>          crée (ou promeut) un compte admin
  seed:users  <nombre>                        crée N profils de riders (photos via proxy)
  seed:matches <email> <convos> <messages>    remplit les conversations d'un compte";

/// Point d'entrée du mode CLI. `args[0]` est le nom de la commande.
pub async fn run(args: &[String]) -> Result<()> {
    let cmd = args[0].as_str();
    let rest = &args[1..];
    let db = connect().await?;
    match cmd {
        "db:reset" => db_reset(&db).await,
        "admin:create" => admin_create(&db, rest).await,
        "seed:users" => seed_users(&db, rest).await,
        "seed:matches" => seed_matches(&db, rest).await,
        other => bail!("commande inconnue : {other}\n\n{USAGE}"),
    }
}

/// Connexion à la base (même logique que le serveur : Postgres en prod via
/// DATABASE_URL avec sslmode=require, SQLite en local par défaut).
async fn connect() -> Result<DatabaseConnection> {
    let mut url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://bmx.db?mode=rwc".to_string());
    if (url.starts_with("postgres://") || url.starts_with("postgresql://"))
        && !url.contains("sslmode=")
    {
        let sep = if url.contains('?') { '&' } else { '?' };
        url = format!("{url}{sep}sslmode=require");
    }
    Database::connect(&url)
        .await
        .context("connexion base de données")
}

// ---------------------------------------------------------------------------
// db:reset
// ---------------------------------------------------------------------------

async fn db_reset(db: &DatabaseConnection) -> Result<()> {
    eprintln!("⚠️  db:reset — suppression de TOUTES les tables puis recréation…");
    Migrator::fresh(db).await.context("réinitialisation")?;
    println!("✓ Base réinitialisée : toutes les tables recréées (+ seed de base).");
    Ok(())
}

// ---------------------------------------------------------------------------
// admin:create
// ---------------------------------------------------------------------------

async fn admin_create(db: &DatabaseConnection, rest: &[String]) -> Result<()> {
    let email = rest
        .first()
        .ok_or_else(|| anyhow!("usage : admin:create <email> <motdepasse>"))?
        .trim()
        .to_lowercase();
    let password = rest
        .get(1)
        .ok_or_else(|| anyhow!("usage : admin:create <email> <motdepasse>"))?;
    let hash = crate::auth::hash_password(password).map_err(|e| anyhow!("hachage : {e}"))?;
    let now = Utc::now();

    if let Some(existing) = user::Entity::find()
        .filter(user::Column::Email.eq(email.clone()))
        .one(db)
        .await?
    {
        let username = existing.username.clone();
        let mut m: user::ActiveModel = existing.into();
        m.role = Set("admin".into());
        m.password_hash = Set(hash);
        m.updated_at = Set(now);
        m.update(db).await?;
        println!("✓ Compte existant promu admin : {email} (@{username})");
    } else {
        let username = unique_username(db, &email).await?;
        let m = user::ActiveModel {
            id: NotSet,
            email: Set(email.clone()),
            username: Set(username.clone()),
            display_name: Set(display_from_email(&email)),
            password_hash: Set(hash),
            bio: NotSet,
            avatar_url: NotSet,
            stance: Set("unknown".into()),
            instagram: NotSet,
            city: NotSet,
            role: Set("admin".into()),
            stripe_customer_id: NotSet,
            stripe_subscription_id: NotSet,
            premium_until: NotSet,
            created_at: Set(now),
            updated_at: Set(now),
        };
        m.insert(db).await?;
        println!("✓ Admin créé : {email} (@{username})");
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// seed:users
// ---------------------------------------------------------------------------

const FIRST: &[&str] = &[
    "Léo", "Manon", "Tom", "Jade", "Hugo", "Noé", "Lina", "Sacha", "Maël", "Anaïs", "Enzo",
    "Kenny", "Rayan", "Margot", "Théo", "Naïm", "Lou", "Adam", "Eliott", "Inès",
];
const LAST: &[&str] = &[
    "Cailloux", "Béton", "Curb", "Nollie", "Grind", "Pop", "Slappy", "Rail", "Manual", "Bigspin",
    "Switch", "Coping", "Wax", "Bowl",
];
const CITIES: &[&str] = &[
    "Paris", "Lyon", "Marseille", "Bordeaux", "Nantes", "Lille", "Toulouse", "Rennes", "Grenoble",
    "Strasbourg", "Montpellier", "Biarritz",
];
const STANCES: &[&str] = &["regular", "goofy"];
const BIOS: &[&str] = &[
    "Toujours une board sous les pieds.",
    "Curb killer du dimanche.",
    "Je pop, donc je suis.",
    "Switch flip ou rien.",
    "Spot hunter.",
    "Bowl & chill.",
    "Cruise the city.",
    "Manual master (presque).",
];

async fn seed_users(db: &DatabaseConnection, rest: &[String]) -> Result<()> {
    let n: usize = rest
        .first()
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| anyhow!("usage : seed:users <nombre>"))?;
    if n == 0 {
        bail!("rien à créer (nombre = 0)");
    }

    // Tous les profils sèment partagent le même mot de passe : on ne hache
    // qu'une fois (Argon2 est lent — 500 hachages prendraient une éternité).
    let password = "bmx1234";
    let hash = crate::auth::hash_password(password).map_err(|e| anyhow!("hachage : {e}"))?;
    // Suffixe unique par exécution pour éviter les collisions email/pseudo.
    let run = to_base36(Utc::now().timestamp() as u64);
    let now = Utc::now();

    let mut models: Vec<user::ActiveModel> = Vec::with_capacity(n);
    {
        let mut rng = rand::thread_rng();
        for i in 0..n {
            let first = *FIRST.choose(&mut rng).unwrap();
            let last = *LAST.choose(&mut rng).unwrap();
            let city = *CITIES.choose(&mut rng).unwrap();
            let stance = *STANCES.choose(&mut rng).unwrap();
            let bio = *BIOS.choose(&mut rng).unwrap();
            let uname = format!("r{run}{i}");
            let email = format!("{uname}@bmx.seed");
            // Photos via le proxy d'avatars pravatar (visage cohérent par `u`).
            let avatar = format!("https://i.pravatar.cc/300?u={uname}");
            models.push(user::ActiveModel {
                id: NotSet,
                email: Set(email),
                username: Set(uname),
                display_name: Set(format!("{first} {last}")),
                password_hash: Set(hash.clone()),
                bio: Set(Some(bio.to_string())),
                avatar_url: Set(Some(avatar)),
                stance: Set(stance.to_string()),
                instagram: NotSet,
                city: Set(Some(city.to_string())),
                role: Set("user".into()),
                stripe_customer_id: NotSet,
                stripe_subscription_id: NotSet,
                premium_until: NotSet,
                created_at: Set(now),
                updated_at: Set(now),
            });
        }
    } // rng (non-Send) libéré avant tout await

    let mut inserted = 0usize;
    for chunk in models.chunks(100) {
        user::Entity::insert_many(chunk.to_vec()).exec(db).await?;
        inserted += chunk.len();
    }
    println!(
        "✓ {inserted} profils créés (mot de passe commun : {password}, photos via i.pravatar.cc)."
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// seed:matches  (adapté : conversations + messages)
// ---------------------------------------------------------------------------

const MSGS: &[&str] = &[
    "Yo, t'étais au bmxpark hier ?",
    "Grosse session ce week-end, t'es chaud ?",
    "J'ai enfin rentré mon kickflip switch 🤙",
    "Tu connais un spot tranquille vers le centre ?",
    "On se cale une session demain soir ?",
    "Ta board elle vient d'où ? Elle pop bien.",
    "RDV au bowl à 18h, ramène la GoPro.",
    "T'as vu la nouvelle part de Thrasher ?",
    "Wax dispo si tu veux pour le curb.",
    "Belle ligne sur ta dernière vidéo 🔥",
    "Ça roule ? On manque de monde dimanche.",
    "Je passe te prendre, garde ta board prête.",
];

async fn seed_matches(db: &DatabaseConnection, rest: &[String]) -> Result<()> {
    let email = rest
        .first()
        .ok_or_else(|| anyhow!("usage : seed:matches <email> <conversations> <messages>"))?
        .trim()
        .to_lowercase();
    let convos: usize = rest
        .get(1)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| anyhow!("usage : seed:matches <email> <conversations> <messages>"))?;
    let total_msgs: usize = rest
        .get(2)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| anyhow!("usage : seed:matches <email> <conversations> <messages>"))?;

    let me = user::Entity::find()
        .filter(user::Column::Email.eq(email.clone()))
        .one(db)
        .await?
        .ok_or_else(|| anyhow!("aucun compte avec l'email {email}"))?;

    let mut others = user::Entity::find()
        .filter(user::Column::Id.ne(me.id))
        .limit(2000)
        .all(db)
        .await?;
    if others.is_empty() {
        bail!("aucun autre utilisateur — lance d'abord `seed:users`.");
    }

    let now = Utc::now();
    let convo_count = convos.clamp(1, others.len());
    let mut models: Vec<message::ActiveModel> = Vec::with_capacity(total_msgs);
    {
        let mut rng = rand::thread_rng();
        others.shuffle(&mut rng);
        let partners = &others[..convo_count];
        for j in 0..total_msgs {
            // On garantit au moins un message par conversation, puis on répartit.
            let partner = &partners[j % convo_count];
            let incoming = rng.gen_bool(0.55);
            let (sender_id, recipient_id) = if incoming {
                (partner.id, me.id)
            } else {
                (me.id, partner.id)
            };
            let body = (*MSGS.choose(&mut rng).unwrap()).to_string();
            // Étalé sur les 30 derniers jours.
            let mins = rng.gen_range(1..60 * 24 * 30) as i64;
            // Les messages entrants sont parfois non lus.
            let read = if incoming { rng.gen_bool(0.4) } else { true };
            models.push(message::ActiveModel {
                id: NotSet,
                sender_id: Set(sender_id),
                recipient_id: Set(recipient_id),
                body: Set(body),
                read: Set(read),
                created_at: Set(now - Duration::minutes(mins)),
            });
        }
    } // rng libéré avant les await

    let mut inserted = 0usize;
    for chunk in models.chunks(100) {
        message::Entity::insert_many(chunk.to_vec()).exec(db).await?;
        inserted += chunk.len();
    }
    println!(
        "✓ {inserted} messages répartis sur {convo_count} conversations pour {}.",
        me.email
    );
    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Dérive un pseudo unique à partir de l'email (partie locale assainie).
async fn unique_username(db: &DatabaseConnection, email: &str) -> Result<String> {
    let raw: String = email
        .split('@')
        .next()
        .unwrap_or("user")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .collect::<String>()
        .to_lowercase();
    let base: String = if raw.len() < 3 {
        format!("user_{raw}")
    } else {
        raw
    }
    .chars()
    .take(24)
    .collect();

    let mut candidate = base.clone();
    let mut n = 1;
    loop {
        let taken = user::Entity::find()
            .filter(user::Column::Username.eq(candidate.clone()))
            .one(db)
            .await?
            .is_some();
        if !taken {
            return Ok(candidate);
        }
        n += 1;
        candidate = format!("{base}{n}");
    }
}

/// Nom affiché par défaut : partie locale de l'email, première lettre en majuscule.
fn display_from_email(email: &str) -> String {
    let local = email.split('@').next().unwrap_or("Admin");
    let mut chars = local.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => "Admin".to_string(),
    }
}

/// Encodage base36 (chiffres + lettres minuscules) d'un entier.
fn to_base36(mut v: u64) -> String {
    const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if v == 0 {
        return "0".to_string();
    }
    let mut out = Vec::new();
    while v > 0 {
        out.push(DIGITS[(v % 36) as usize]);
        v /= 36;
    }
    out.reverse();
    String::from_utf8(out).unwrap()
}
