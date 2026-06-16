# bmx — backend (Rust / actix-web) pour déploiement conteneur (Heroku).
# Build multi-stage : compilation en release puis image runtime minimale.

# ---------- Build ----------
FROM rust:1-bookworm AS builder
WORKDIR /app

# Cache des dépendances : on copie d'abord les manifestes du workspace, on
# compile des cibles factices, puis on remplace par le vrai code.
COPY Cargo.toml Cargo.lock ./
COPY api/Cargo.toml api/Cargo.toml
COPY entity/Cargo.toml entity/Cargo.toml
COPY migration/Cargo.toml migration/Cargo.toml
RUN mkdir -p api/src entity/src migration/src \
    && echo 'fn main() {}' > api/src/main.rs \
    && echo 'fn main() {}' > migration/src/main.rs \
    && echo '' > entity/src/lib.rs \
    && echo '' > migration/src/lib.rs \
    && cargo build --release -p api 2>/dev/null || true

# Code réel.
COPY . .
# `touch` pour forcer la recompilation des crates locales après la couche de cache.
RUN find api entity migration -name '*.rs' -exec touch {} + \
    && cargo build --release -p api

# ---------- Runtime ----------
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/api /usr/local/bin/api

ENV RUST_LOG=info,api=info,sqlx=warn
# Heroku/Render injectent $PORT ; main.rs écoute sur 0.0.0.0:$PORT.
CMD ["api"]
