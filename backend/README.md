# bmx — backend 🚲

API REST en **Rust** (Actix-web 4) + **SeaORM** (Postgres en prod, SQLite en local).
Workspace en trois crates : `entity` (modèles), `migration` (schéma + seed), `api` (serveur HTTP).

## Démarrer

```bash
cd backend
cp .env.example .env        # ajuste si besoin (SQLite par défaut, zéro install)
cargo run -p api            # applique les migrations puis sert sur :8080
```

Santé : `GET http://localhost:8080/api/v1/healthz`

## Migrations

Les migrations sont appliquées automatiquement au démarrage de l'API. En manuel :

```bash
cargo run -p migration -- up        # appliquer
cargo run -p migration -- down      # annuler la dernière
cargo run -p migration -- fresh     # tout recréer
```

## Commandes d'administration (CLI)

Le binaire `api` bascule en mode CLI dès que le premier argument contient un `:`
(sinon il démarre le serveur HTTP). Pratique pour réinitialiser et peupler la base.

```bash
cargo run -p api -- db:reset                                    # ⚠️ efface TOUTES les tables puis recrée (+ seed)
cargo run -p api -- admin:create admin@bmx.app 'Admin123!' # crée (ou promeut) un compte admin
cargo run -p api -- seed:users 500                              # crée 500 profils de riders (photos via proxy pravatar)
cargo run -p api -- seed:matches admin@bmx.app 12 400      # 12 conversations + 400 messages pour ce compte
cargo run -p api -- seed:matches maxlestage@icloud.com 12 400   # idem pour ton compte
```

En production (image conteneur Heroku, binaire sur le `PATH`) :

```bash
heroku run api db:reset -a <app>
heroku run api admin:create admin@bmx.app 'Admin123!' -a <app>
heroku run api seed:users 500 -a <app>
heroku run api seed:matches admin@bmx.app 12 400 -a <app>
```

> **Note domaine.** « bmx » est une app de bmx : il n'y a pas de *match*
> ni de *like* entre utilisateurs comme dans une app de rencontres. `seed:matches`
> est donc adapté et sème des **conversations + messages** (l'interaction sociale
> réelle entre comptes) pour l'email donné. Les profils créés par `seed:users`
> partagent le mot de passe `bmx1234`.

## Authentification

JWT Bearer (Argon2id pour les mots de passe). Récupère un token via `/register` ou
`/login`, puis envoie `Authorization: Bearer <token>`. Les routes de création de
contenu de référence (concours, sondages, news, riders, comptes mis en avant)
exigent le rôle `admin`.

## Domaines & endpoints (`/api/v1`)

| Domaine | Endpoints |
|---|---|
| **Comptes** | `POST /register`, `POST /login`, `GET /me`, `POST /me` |
| **Sons** (pour les parts) | `GET /sounds`, `GET /sounds/{id}`, `POST /sounds`, `POST /sounds/{id}/download` |
| **Parts** (montages VHS/fisheye) | `GET /parts?sort=recent\|popular`, `GET /parts/{id}`, `POST /parts`, `POST /parts/{id}/like` |
| **Artworks** (dessins/logos) | `GET /artworks?kind=logo`, `GET /artworks/{id}`, `POST /artworks`, `POST /artworks/{id}/like` |
| **Concours** (bmxpark/logo/nom) | `GET /contests`, `GET /contests/{id}`, `POST /contests` *(admin)*, `POST /contests/{id}/entries`, `POST /contests/entries/{id}/vote` |
| **Spots** (carte France) | `GET /spots?spot_type=&city=`, `GET /spots/{id}`, `POST /spots`, `POST /spots/{id}/approve` *(admin)* |
| **Marketplace** (annonces) | `GET /listings?category=&city=&status=`, `GET /listings/{id}`, `POST /listings`, `POST /listings/{id}/sold`, `POST /listings/{id}/remove` |
| **Offres** (négociation) | `GET /listings/{id}/offers` *(vendeur)*, `POST /listings/{id}/offers`, `POST /offers/{id}/accept`, `POST /offers/{id}/decline` |
| **Sessions** (rendez-vous) | `GET /sessions?city=&include_past=`, `GET /sessions/{id}`, `POST /sessions`, `POST /sessions/{id}/join`, `POST /sessions/{id}/leave` |
| **Shops** (annuaire) | `GET /shops?city=`, `GET /shops/{id}`, `POST /shops`, `POST /shops/{id}/approve` *(admin)* |
| **Sondages** | `GET /polls`, `GET /polls/{id}`, `POST /polls` *(admin)*, `POST /polls/{id}/vote` |
| **Vidéos** (flux Thrasher) | `GET /videos`, `GET /videos/{id}`, `POST /import/run` *(admin)* |
| **Classement riders** | `GET /riders`, `GET /riders/{id}`, `POST /riders` *(admin)*, `POST /riders/{id}/rate` |
| **News** | `GET /news`, `GET /news/{slug}`, `POST /news` *(admin)* |
| **Comptes mis en avant** | `GET /featured/current`, `GET /featured`, `POST /featured` *(admin)* |

Les parts portent leurs **effets de montage** en JSON (`vhs`, `fisheye`, `grain`,
`slowmo`) — la vidéo finale est rendue côté client puis postée sur TikTok.

## Effets d'une part (exemple)

```json
POST /api/v1/parts
{
  "title": "Ligne au Prado",
  "video_url": "https://cdn.example/part.mp4",
  "duration_secs": 22,
  "sound_id": 3,
  "effects": { "vhs": true, "fisheye": 0.6, "grain": 0.3, "slowmo": 0.0 }
}
```

## Imports automatiques (cron intégré)

Une tâche de fond (tokio) rafraîchit périodiquement deux sources externes :

- **Riders** — scraping de `theboardr.com` (liens de profil + photos sur leur
  blob Azure). Upsert idempotent par `(source, external_id)`. ~500 riders.
- **Vidéos** — flux RSS de la chaîne **YouTube de Thrasher** (le site bloque les
  bots). Upsert par id de vidéo.

Réglages (voir `.env.example`) : `IMPORT_ENABLED`, `IMPORT_INTERVAL_HOURS` (défaut
6 h), `IMPORT_ON_BOOT`, `THRASHER_YT_FEED`. Déclenchement manuel : `POST /api/v1/import/run`
*(admin)*. Le client HTTP utilise les **racines TLS système** (`ca-certificates`
est installé dans l'image Docker).

> Sur Heroku, garde un dyno qui ne s'endort pas (plan ≥ Basic) pour que le cron
> tourne ; sinon le rafraîchissement n'a lieu qu'au réveil du dyno.

## Premium « bmx+ » (Stripe)

Abonnement géré via Stripe (API REST + webhook signé). Endpoints :
`POST /billing/checkout` et `POST /billing/portal` *(auth)* renvoient une URL
Stripe ; `POST /billing/webhook` reçoit les évènements (signature vérifiée).

Configuration (Heroku config / `.env`) :

```bash
STRIPE_SECRET_KEY=sk_live_xxx      # ou sk_test_xxx
STRIPE_PRICE_ID=price_xxx          # prix récurrent (mensuel/annuel)
STRIPE_WEBHOOK_SECRET=whsec_xxx    # secret du endpoint webhook
APP_BASE_URL=https://maxlestage.github.io/BMX   # redirections Checkout/Portal
```

Étapes Stripe :
1. Crée un **produit + prix récurrent** → `STRIPE_PRICE_ID`.
2. Active le **portail client** (Settings → Billing → Customer portal).
3. Ajoute un **webhook** vers `https://<app>.herokuapp.com/api/v1/billing/webhook`
   (évènements `checkout.session.completed`, `customer.subscription.*`) →
   `STRIPE_WEBHOOK_SECRET`.

Tant que `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID` ne sont pas définis, les routes de
paiement répondent « paiement non configuré » (le reste de l'app fonctionne).
Avantage premium server-enforced : upload jusqu'à **64 Mo** (32 Mo en gratuit) et
effets de montage avancés (VHS/fisheye/slow-mo).

### RevenueCat (achats in-app)

Un client mobile peut encaisser l'abonnement via **RevenueCat**
(achat in-app iOS/Android). Configure un webhook RevenueCat vers
`POST /api/v1/billing/revenuecat` avec `Authorization: Bearer <secret>` et pose
`REVENUECAT_WEBHOOK_AUTH=<secret>` côté backend. Le webhook met à jour
`premium_until` à partir de `app_user_id` (= id utilisateur) — même statut premium
que pour Stripe.

> Stores : pour les apps natives (Capacitor), Apple/Google imposent leur achat
> in-app pour le numérique. Stripe reste pour le web/PWA et les biens physiques.

## Données de démo

La migration de seed insère deux sondages (taille de board, trucks), quatre
riders et quelques spots français pour avoir une carte non vide dès le départ.

## Déploiement Heroku (conteneur Docker)

Le serveur lit `$PORT` (sinon `BIND_ADDR`, sinon `:8080`) et force `sslmode=require`
sur un `DATABASE_URL` Postgres — compatible Heroku. Le déploiement se fait par
**image Docker** (le `Dockerfile` est dans `backend/`), ce qui évite les bidouilles
de buildpack pour un projet en sous-dossier.

### En une commande

```bash
cd backend
./deploy-heroku.sh                # app par défaut : bmx-api
# ou : HEROKU_APP=mon-api HEROKU_REGION=eu ./deploy-heroku.sh
```

Le script est **idempotent** et enchaîne : prérequis → création de l'app (stack
`container`) → add-on Postgres → secrets (`JWT_SECRET` généré) → `container:push` +
`container:release` → vérification `/healthz` → réglage de la variable GitHub
`BMX_API_URL` (si `gh` est dispo, sinon il affiche la marche à suivre).

**Prérequis** : Docker (daemon lancé) et Heroku CLI (`heroku login` effectué).

### À la main (équivalent)

```bash
heroku create bmx-api --stack container
heroku addons:create heroku-postgresql:essential-0 -a bmx-api
heroku config:set JWT_SECRET="$(openssl rand -hex 32)" JWT_TTL_HOURS=72 -a bmx-api
cd backend && heroku container:login
heroku container:push web -a bmx-api
heroku container:release web -a bmx-api
```

### Sans Docker local : `git push` (heroku.yml)

`backend/heroku.yml` permet à Heroku de builder l'image lui-même. On pousse le
sous-dossier `backend/` comme racine :

```bash
heroku stack:set container -a bmx-api
git subtree push --prefix backend heroku main
```

### Auto-déploiement (GitHub Actions)

`.github/workflows/deploy-backend.yml` build & release l'image à **chaque push sur
`main`** touchant `backend/`. À configurer une fois (Settings → Secrets and
variables → Actions) :

- Variable **`HEROKU_APP`** = `bmx-api`
- Secret **`HEROKU_API_KEY`** = `heroku authorizations:create -d "github actions"` (champ *Token*)

Sans ces réglages, le job est simplement ignoré.

> SQLite n'est pas adapté à Heroku (FS éphémère). En prod, `DATABASE_URL` (Postgres)
> prend le relais — le code le gère déjà. Les migrations + le seed tournent au
> démarrage de l'app.

### Compte admin

Pour valider des spots ou créer des sondages (routes `admin`), passe ton compte
en admin après inscription :

```bash
heroku pg:psql -a bmx-api -c "UPDATE users SET role='admin' WHERE email='ton@email';"
```

### Brancher le front sur cette API

Le front lit l'URL de l'API au build via `BMX_API_URL`. Pour que le site
GitHub Pages pointe sur Heroku, définis une **variable de dépôt** (Settings →
Secrets and variables → Actions → *Variables*) — le script le fait pour toi si `gh`
est installé :

```
BMX_API_URL = https://bmx-api.herokuapp.com/api/v1
```

Le workflow `deploy.yml` l'injecte automatiquement au build. En local, `bun run dev`
retombe sur `http://localhost:8080/api/v1`.
