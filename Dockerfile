# Backend bmx pour Heroku (heroku.yml). Contexte = racine du repo, donc on
# copie le sous-dossier backend/. Pour le build local utiliser backend/Dockerfile.
FROM rust:1-bookworm AS builder
WORKDIR /app
COPY backend/ ./
RUN cargo build --release -p api

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/api /usr/local/bin/api
ENV RUST_LOG=info,api=info,sqlx=warn
# Heroku injecte $PORT ; main.rs écoute sur 0.0.0.0:$PORT.
CMD ["api"]
