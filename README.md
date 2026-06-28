# bmx 🚲

> *Le bmx, c'est pour toujours.*

`bmx riders company`

**bmx** est une **communauté de bmx** : une PWA installable (Vue 3 + Vite)
adossée à une **API Rust**, plus une **app iOS native** SwiftUI. Au-delà de la landing
« lettre d'amour au bmx », l'app propose un vrai réseau — parts vidéo, carte des
spots, classement des riders, messagerie, notifications et abonnement premium.

🔗 **Site** : https://maxlestage.github.io/BMX/

---

## Fonctionnalités

- **App shell** façon native : barre d'onglets en bas (Accueil · Crew · Vidéos · Spots · Messages · Profil), routage par hash.
- **Comptes & profils** : inscription / connexion (JWT), profils publics cliquables, **photo de profil** (upload + recadrage), stats.
- **Parts** : publication de clips vidéo, likes, effets de montage (réservés à bmx+).
- **Spots** : carte communautaire (Leaflet), ajout de spots avec photos, modération.
- **Marketplace** : petites annonces de matos entre membres — photos, catégories, offres de prix (négociation), contact vendeur en messagerie.
- **Sessions** : rendez-vous bmx proposés par les membres (spot/ville + horaire), inscription en un clic.
- **Shops** : carte mondiale des BMX shops sur sa propre carte (732 shops pré-référencés via OpenStreetMap, recherche par nom/ville) — annuaire pur, on n'y vend rien ; ajouts communautaires modérés.
- **Classement riders**, **sondages**, **vidéos** (flux Thrasher), **news**, **concours**, **artworks**.
- **Messagerie** entre membres + **partage de spot** en message.
- **Notifications** : badge in-app des non-lus + **push natives** (Web Push / VAPID).
- **Premium ✦ bmx+** : abonnement Stripe — upload HD, effets, sans pub.
- **Recherche** intelligente (spots / riders / vidéos, parsing ville & type).
- **PWA** complète : service worker (cache-first / network-first), offline, prompt d'installation (Android + iOS).
- **7 langues** : 🇫🇷 FR · 🇬🇧 EN · 🇪🇸 ES · 🇩🇪 DE · 🇵🇹 PT · 🇨🇳 中文 · 🇯🇵 日本語.
- **Pages** À propos / Presse / Mentions légales (CGU, CGV, Confidentialité, Cookies, RGPD) + Contact.

## Stack

**Front (PWA)** — `./` + `src/`
- **Vue 3** (`<script setup>`) + **Vite** + TypeScript strict, **CSS maison** (polices système, zéro requête réseau).
- **Leaflet** (carte des spots), **three.js** (vélo BMX 3D du hero, `Bike3D.vue`, chargé à la demande).

**Back (API)** — `backend/`
- **Rust** · **actix-web 4** · **SeaORM 1.1** · **PostgreSQL** (prod) / **SQLite** (dev).
- Auth **JWT** (argon2), paiement **Stripe** (REST + webhooks HMAC), **Web Push** (`web-push-native`, VAPID).
- Médias stockés en base, import cron (riders theboardr, vidéos Thrasher YouTube).
- Workspace : `api` (serveur) · `entity` (modèles SeaORM) · `migration`.

**iOS** — `ios/`
- **Swift / SwiftUI** pur (zéro dépendance), iOS 17+, token JWT en Keychain.

## Monorepo

```
index.html / vite.config.ts   Entrée + config de build Vite (front)
src/
  main.ts                Point d'entrée (monte App.vue, service worker)
  App.vue                Shell (onglets + routeur de pages par hash)
  api.ts                 Client API typé (JWT)
  auth.ts / ui.ts        Stores réactifs auth & UI globale
  i18n.ts                i18n (7 langues, détection auto)
  composables/           useReveal, usePwaInstall
  locales/               fr · en · es · de · pt · zh · ja
  components/              (.vue)
    community/           Account, Parts, Spots, Riders, Polls, Videos
    pages/               About, Press, Legal (pages du footer)
    …                    Nav, Hero, Bike3D, Messages, TabBar, Avatar, ProfileModal, …
public/                  sw.js, manifest, offline.html, icônes
backend/
  api/src/handlers/      accounts, parts, spots, messages, push, billing, media, …
  entity/ · migration/   modèles & migrations SeaORM
ios/                     app iOS native SwiftUI (Xcode)
scripts/gen_logo.py      logo bmx (wordmark + vélo) ; gen_icons.py → icônes PWA
```

## Démarrer

**Front**
```bash
bun install        # ou npm install
bun run dev        # → Vite (http://localhost:5173)
```

**Back** (SQLite par défaut, migrations appliquées au démarrage). Le workspace
Rust est à la racine (`Cargo.toml`), les crates dans `backend/`.
```bash
cargo run -p api          # → http://localhost:8080/api/v1
```

**iOS** (Xcode 16+, voir [`ios/README.md`](./ios/README.md))
```bash
open ios/Bmx.xcodeproj
```

En dev, le front tape par défaut sur l'API locale `http://localhost:8080/api/v1` ;
en prod il vise l'API Heroku. Surchargeable au build via `BMX_API_URL`.

## Build & vérifications

```bash
bun run build      # vue-tsc + vite build → dist/ (assets fingerprintés + PWA)
bun run preview    # sert dist/ (vite preview)
bun run typecheck  # vue-tsc --noEmit (strict)

cargo build --release -p api      # backend (workspace à la racine)
```

Le service worker n'est actif qu'en production (jamais sur `localhost`) pour éviter
les caches rances pendant le développement.

## Variables d'environnement

**Front (build)** — `BMX_API_URL`.

**Back** — `DATABASE_URL` (sinon SQLite), `JWT_SECRET`, `APP_BASE_URL`,
`STRIPE_SECRET_KEY` · `STRIPE_PRICE_ID` · `STRIPE_WEBHOOK_SECRET`,
`VAPID_PRIVATE_KEY` · `VAPID_SUBJECT` (push), `REVENUECAT_WEBHOOK_AUTH`.
Chaque intégration est **optionnelle** : absente, elle se désactive proprement.

> Générer une paire de clés VAPID : `cargo run -p api --example genvapid`

## Déploiement

Le backend Rust sert l'**API et le front Vue** (même origine, pas de CORS). Trois voies :

**A. Heroku depuis le Dashboard / mobile (buildpacks, sans CLI)** — multi-buildpack
`heroku/nodejs` (build le front → `dist/`) + buildpack Rust (compile `target/release/api`).
Le `Procfile` lance le binaire qui sert `dist/` (`STATIC_DIR=dist`). Config via `app.json`
(bouton « Deploy to Heroku ») ou via *Settings → Buildpacks* + *Resources* (Postgres) +
*Config Vars* (`JWT_SECRET`, `STATIC_DIR=dist`).

**B. Container (Render, ou Heroku container en CLI)** — le `Dockerfile` racine build le
front puis le backend et sert `dist/`. Render : *New → Blueprint* (`render.yaml`).
Heroku : `./deploy.sh <app>` (stack container + Postgres + `JWT_SECRET` + push).

Autres cibles (optionnel) :
- **CI** : `.github/workflows/ci.yml` lance `typecheck` + `build` sur chaque PR.

## Icônes

```bash
python3 scripts/gen_icons.py   # icon-192/512 maskables + apple-touch-icon
```

## Licence

Projet **propriétaire** — tous droits réservés © Lestage Maxime Nathan.
Voir [`LICENSE`](./LICENSE) (licence propriétaire) et
[`LICENCE-COMMERCIALE.md`](./LICENCE-COMMERCIALE.md) (conditions de cession / vente).
Toute copie, fork, redistribution ou usage commercial est interdit sans autorisation
écrite préalable.

---

Fait avec amour et un peu de pegs.
