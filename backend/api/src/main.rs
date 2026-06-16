use actix_cors::Cors;
use actix_files::{Files, NamedFile};
use actix_web::dev::{fn_service, ServiceRequest, ServiceResponse};
use actix_web::{web, App, HttpServer};
use sea_orm::{Database, DatabaseConnection};
use tracing_actix_web::TracingLogger;
use tracing_subscriber::EnvFilter;

mod auth;
mod billing;
mod cli;
mod errors;
mod handlers;
mod importers;
mod push;

use auth::JwtConfig;
use billing::BillingConfig;
use push::PushConfig;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub jwt: JwtConfig,
    pub billing: BillingConfig,
    pub push: PushConfig,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    // Mode CLI : `api <commande:...> [args]` exécute une commande d'administration
    // (db:reset, admin:create, seed:users, seed:matches) puis quitte. Le serveur
    // HTTP n'est lancé que sans sous-commande.
    let argv: Vec<String> = std::env::args().skip(1).collect();
    if argv.first().map(|c| c.contains(':')).unwrap_or(false) {
        if let Err(e) = cli::run(&argv).await {
            eprintln!("✗ {e:#}");
            std::process::exit(1);
        }
        return Ok(());
    }

    // Postgres en prod (DATABASE_URL), SQLite par défaut en local.
    let mut database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://bmx.db?mode=rwc".to_string());
    // Heroku Postgres impose SSL (certif hors racines standard) : on force
    // sslmode=require (chiffré, sans vérification de chaîne) s'il n'est pas déjà
    // précisé. Sans ça, la connexion TLS via rustls échoue.
    if (database_url.starts_with("postgres://") || database_url.starts_with("postgresql://"))
        && !database_url.contains("sslmode=")
    {
        let sep = if database_url.contains('?') { '&' } else { '?' };
        database_url = format!("{database_url}{sep}sslmode=require");
    }
    let db = Database::connect(&database_url)
        .await
        .expect("connexion base de données");

    // Applique les migrations au démarrage.
    {
        use migration::MigratorTrait;
        migration::Migrator::up(&db, None)
            .await
            .expect("migrations");
    }

    let state = AppState {
        db,
        jwt: JwtConfig::from_env(),
        billing: BillingConfig::from_env(),
        push: PushConfig::from_env(),
    };

    // Cron intégré : rafraîchit riders (theboardr) et vidéos (Thrasher).
    importers::spawn_scheduler(state.db.clone());

    // BIND_ADDR explicite ; sinon 0.0.0.0:$PORT (Heroku/Render) ; sinon :8080.
    let bind = std::env::var("BIND_ADDR").unwrap_or_else(|_| {
        std::env::var("PORT")
            .map(|p| format!("0.0.0.0:{p}"))
            .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
    });
    // Dossier des fichiers statiques du front (build Vue). Servi par le même
    // serveur que l'API → une seule app/URL, même origine, pas de CORS.
    // Absent (ex. dev API seul) → on ne monte rien et seul /api/v1 répond.
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "./static".to_string());
    tracing::info!("bmx-api → http://{bind} (static: {static_dir})");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);
        let sd = static_dir.clone();

        App::new()
            .app_data(web::Data::new(state.clone()))
            .app_data(web::JsonConfig::default().limit(4 * 1024 * 1024))
            // Uploads de médias (vidéos/photos) en corps brut : 192 Mo.
            .app_data(web::PayloadConfig::new(192 * 1024 * 1024))
            .wrap(cors)
            .wrap(TracingLogger::default())
            .service(
                web::scope("/api/v1")
                    // Santé
                    .service(handlers::health::healthz)
                    // Administration (réservé au rôle admin)
                    .service(handlers::admin::stats)
                    // Médias (vidéos/photos stockés en base)
                    .service(handlers::media::upload)
                    .service(handlers::media::meta)
                    .service(handlers::media::serve)
                    // Comptes / auth
                    .service(handlers::accounts::register)
                    .service(handlers::accounts::login)
                    .service(handlers::accounts::me)
                    .service(handlers::accounts::profile)
                    .service(handlers::accounts::update_me)
                    .service(handlers::accounts::me_stats)
                    // Paiement / abonnement premium (Stripe)
                    .service(handlers::billing::checkout)
                    .service(handlers::billing::portal)
                    .service(handlers::billing::webhook)
                    .service(handlers::billing::revenuecat)
                    // Sons
                    .service(handlers::sounds::index)
                    .service(handlers::sounds::create)
                    .service(handlers::sounds::download)
                    .service(handlers::sounds::show)
                    // Parts
                    .service(handlers::parts::index)
                    .service(handlers::parts::create)
                    .service(handlers::parts::like)
                    .service(handlers::parts::show)
                    // Artworks
                    .service(handlers::artworks::index)
                    .service(handlers::artworks::create)
                    .service(handlers::artworks::like)
                    .service(handlers::artworks::show)
                    // Concours
                    .service(handlers::contests::index)
                    .service(handlers::contests::create)
                    .service(handlers::contests::submit_entry)
                    .service(handlers::contests::vote)
                    .service(handlers::contests::show)
                    // Spots
                    .service(handlers::spots::index)
                    .service(handlers::spots::create)
                    .service(handlers::spots::approve)
                    .service(handlers::spots::show)
                    // Marketplace (annonces + offres / négociation)
                    .service(handlers::marketplace::index)
                    .service(handlers::marketplace::create)
                    .service(handlers::marketplace::mark_sold)
                    .service(handlers::marketplace::remove)
                    .service(handlers::marketplace::offers)
                    .service(handlers::marketplace::make_offer)
                    .service(handlers::marketplace::accept_offer)
                    .service(handlers::marketplace::decline_offer)
                    .service(handlers::marketplace::show)
                    // Sessions de bmx (rendez-vous entre membres)
                    .service(handlers::sessions::index)
                    .service(handlers::sessions::create)
                    .service(handlers::sessions::join)
                    .service(handlers::sessions::leave)
                    .service(handlers::sessions::show)
                    // Annuaire des BMX shops
                    .service(handlers::shops::index)
                    .service(handlers::shops::create)
                    .service(handlers::shops::approve)
                    .service(handlers::shops::show)
                    // Vidéos (flux YouTube Thrasher, rafraîchi par cron)
                    .service(handlers::videos::index)
                    .service(handlers::videos::show)
                    .service(handlers::videos::run_import)
                    // Messagerie
                    .service(handlers::messages::conversations)
                    .service(handlers::messages::unread_count)
                    .service(handlers::messages::thread)
                    .service(handlers::messages::send)
                    // Notifications push (Web Push / VAPID)
                    .service(handlers::push::vapid)
                    .service(handlers::push::subscribe)
                    .service(handlers::push::unsubscribe)
                    // Sondages
                    .service(handlers::polls::index)
                    .service(handlers::polls::create)
                    .service(handlers::polls::vote)
                    .service(handlers::polls::show)
                    // Classement riders
                    .service(handlers::riders::index)
                    .service(handlers::riders::create)
                    .service(handlers::riders::rate)
                    .service(handlers::riders::show)
                    // News
                    .service(handlers::news::index)
                    .service(handlers::news::create)
                    .service(handlers::news::show)
                    // Comptes mis en avant
                    .service(handlers::featured::current)
                    .service(handlers::featured::index)
                    .service(handlers::featured::create),
            )
            // Front Vue (statique) + fallback SPA → tout ce qui n'est pas
            // /api/v1 renvoie index.html (routage par hash côté client).
            .configure(|cfg| mount_static(cfg, &sd))
    })
    .bind(bind)?
    .run()
    .await
}

/// Monte le front statique sur `/` si le dossier existe, avec fallback SPA.
fn mount_static(cfg: &mut web::ServiceConfig, dir: &str) {
    if !std::path::Path::new(dir).exists() {
        return;
    }
    let index = format!("{dir}/index.html");
    cfg.service(
        Files::new("/", dir)
            .index_file("index.html")
            .default_handler(fn_service(move |req: ServiceRequest| {
                let index = index.clone();
                async move {
                    let (req, _payload) = req.into_parts();
                    let file = NamedFile::open_async(&index).await?;
                    let res = file.into_response(&req);
                    Ok::<ServiceResponse, actix_web::Error>(ServiceResponse::new(req, res))
                }
            })),
    );
}
