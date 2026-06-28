# bmx — image unique (container) : le backend Rust sert l'API ET le front Vue.
# Sert pour un déploiement conteneur (Render, ou Heroku container en CLI).
# Le workspace Rust est à la racine (Cargo.toml), les crates dans backend/.
# Contexte de build = racine du repo.

# ---------- 1) Front (Vue 3 / Vite) ----------
FROM node:22-bookworm-slim AS front
WORKDIR /front
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html env.d.ts ./
COPY src ./src
COPY public ./public
RUN npx vite build

# ---------- 2) Backend (Rust / actix-web) ----------
FROM rust:1-bookworm AS backend
WORKDIR /app
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY backend ./backend
# On retire rust-toolchain.toml pour utiliser le toolchain stable DÉJÀ présent
# dans l'image (évite un re-téléchargement du canal par rustup).
RUN rm -f rust-toolchain.toml && cargo build --release -p api

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
CMD ["api"]
