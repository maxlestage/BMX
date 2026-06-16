# bmx — image unique Heroku (container) : le backend Rust sert l'API ET le
# front Vue. Build multi-stage. Contexte de build = racine du repo.

# ---------- 1) Front (Vue 3 / Vite) ----------
FROM node:22-bookworm-slim AS front
WORKDIR /front
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html env.d.ts ./
COPY src ./src
COPY public ./public
RUN npm run build          # → /front/dist

# ---------- 2) Backend (Rust / actix-web) ----------
FROM rust:1-bookworm AS backend
WORKDIR /app
# Cache des dépendances : manifestes d'abord, cibles factices, puis vrai code.
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/api/Cargo.toml api/Cargo.toml
COPY backend/entity/Cargo.toml entity/Cargo.toml
COPY backend/migration/Cargo.toml migration/Cargo.toml
RUN mkdir -p api/src entity/src migration/src \
 && echo 'fn main(){}' > api/src/main.rs \
 && echo 'fn main(){}' > migration/src/main.rs \
 && echo '' > entity/src/lib.rs && echo '' > migration/src/lib.rs \
 && cargo build --release -p api 2>/dev/null || true
COPY backend/ ./
RUN find api entity migration -name '*.rs' -exec touch {} + \
 && cargo build --release -p api

# ---------- 3) Runtime ----------
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/api /usr/local/bin/api
COPY --from=front /front/dist /app/static
ENV RUST_LOG=info,api=info,sqlx=warn
ENV STATIC_DIR=/app/static
# Heroku injecte $PORT ; main.rs écoute sur 0.0.0.0:$PORT et sert /app/static.
CMD ["api"]
