# bmx — image unique Heroku (container) : le backend Rust sert l'API ET le
# front Vue (même origine). Build multi-stage. Contexte de build = racine du repo.
#
# Déploiement (le build du Dockerfile ne se déclenche QU'en CLI, pas via le
# déploiement GitHub du Dashboard qui, lui, utilise les buildpacks) :
#   heroku stack:set container -a <app>
#   git push heroku main          # ou ./deploy.sh <app>

# ---------- 1) Front (Vue 3 / Vite) ----------
FROM node:22-bookworm-slim AS front
WORKDIR /front
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html env.d.ts ./
COPY src ./src
COPY public ./public
# Build de prod. On lance vite directement (le typecheck vue-tsc tourne en
# dev/CI, inutile et plus lourd ici).
RUN npx vite build

# ---------- 2) Backend (Rust / actix-web) ----------
FROM rust:1-bookworm AS backend
WORKDIR /app
COPY backend/ ./
RUN cargo build --release -p api

# ---------- 3) Runtime ----------
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/api /usr/local/bin/api
COPY --from=front  /front/dist               /app/static
ENV RUST_LOG=info,api=info,sqlx=warn
ENV STATIC_DIR=/app/static
# Heroku injecte $PORT ; main.rs écoute sur 0.0.0.0:$PORT et sert /app/static
# (+ /api/v1). heroku.yml lance la commande `api`.
CMD ["api"]
