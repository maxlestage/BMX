#!/usr/bin/env bash
# Déploiement du backend bmx sur Heroku (conteneur Docker).
#
# Idempotent : crée l'app si besoin, provisionne Postgres, pose les secrets,
# build & push l'image Docker, applique la release, puis vérifie /healthz.
#
# Prérequis : Docker (daemon lancé), Heroku CLI (`heroku login` fait).
# Usage :
#   ./deploy-heroku.sh [nom-app]
#   HEROKU_APP=mon-api HEROKU_REGION=eu ./deploy-heroku.sh
#
# Variables d'environnement optionnelles :
#   HEROKU_APP      nom de l'app Heroku        (défaut: bmx-api)
#   HEROKU_REGION   région (us|eu)             (défaut: us)
#   PG_PLAN         plan Postgres              (défaut: essential-0)
#   JWT_TTL_HOURS   durée de vie des tokens    (défaut: 72)
#   GH_REPO         dépôt GitHub owner/name    (défaut: maxlestage/BMX)

set -euo pipefail

APP="${1:-${HEROKU_APP:-bmx-api}}"
REGION="${HEROKU_REGION:-us}"
PG_PLAN="${PG_PLAN:-essential-0}"
JWT_TTL_HOURS="${JWT_TTL_HOURS:-72}"
GH_REPO="${GH_REPO:-maxlestage/BMX}"
APP_BASE_URL="${APP_BASE_URL:-https://maxlestage.github.io/BMX}"

# Couleurs (si terminal).
if [ -t 1 ]; then BOLD=$(tput bold); DIM=$(tput dim); RST=$(tput sgr0); else BOLD=""; DIM=""; RST=""; fi
step() { echo "${BOLD}▶ $*${RST}"; }
info() { echo "  ${DIM}$*${RST}"; }
die()  { echo "${BOLD}✗ $*${RST}" >&2; exit 1; }

# Se placer dans le dossier du script (racine du build Docker).
cd "$(dirname "$0")"

# ---- Prérequis -------------------------------------------------------------
step "Vérification des prérequis"
command -v heroku >/dev/null 2>&1 || die "Heroku CLI introuvable : https://devcenter.heroku.com/articles/heroku-cli"
command -v docker >/dev/null 2>&1 || die "Docker introuvable : installe Docker Desktop."
docker info >/dev/null 2>&1 || die "Le daemon Docker ne tourne pas. Lance Docker puis réessaie."
heroku whoami >/dev/null 2>&1 || die "Pas connecté à Heroku. Fais : heroku login"
info "App cible : ${BOLD}$APP${RST}${DIM} (région $REGION)"

# ---- App -------------------------------------------------------------------
step "App Heroku"
if heroku apps:info -a "$APP" >/dev/null 2>&1; then
  info "L'app existe déjà."
else
  info "Création de l'app…"
  heroku create "$APP" --region "$REGION" --stack container
fi
# S'assurer que la stack est bien « container ».
heroku stack:set container -a "$APP" >/dev/null 2>&1 || true

# ---- Base de données -------------------------------------------------------
step "Base de données Postgres"
if heroku addons -a "$APP" 2>/dev/null | grep -qi postgres; then
  info "Add-on Postgres déjà présent."
else
  info "Provisionnement de heroku-postgresql:$PG_PLAN…"
  heroku addons:create "heroku-postgresql:$PG_PLAN" -a "$APP"
fi

# ---- Secrets / config ------------------------------------------------------
step "Configuration (secrets)"
current_jwt="$(heroku config:get JWT_SECRET -a "$APP" 2>/dev/null || true)"
if [ -z "$current_jwt" ]; then
  if command -v openssl >/dev/null 2>&1; then
    new_secret="$(openssl rand -hex 32)"
  else
    new_secret="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  fi
  heroku config:set "JWT_SECRET=$new_secret" -a "$APP" >/dev/null
  info "JWT_SECRET généré et posé."
else
  info "JWT_SECRET déjà défini (inchangé)."
fi
heroku config:set "JWT_TTL_HOURS=$JWT_TTL_HOURS" "RUST_LOG=info,api=info,sqlx=warn" \
  "APP_BASE_URL=$APP_BASE_URL" -a "$APP" >/dev/null
info "JWT_TTL_HOURS=$JWT_TTL_HOURS · APP_BASE_URL=$APP_BASE_URL"
if [ -z "$(heroku config:get STRIPE_SECRET_KEY -a "$APP" 2>/dev/null)" ]; then
  info "ⓘ Premium : pense à poser les clés Stripe :"
  info "   heroku config:set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... -a $APP"
fi

# ---- Build & push de l'image ----------------------------------------------
step "Build & push de l'image Docker (peut prendre plusieurs minutes)"
heroku container:login
heroku container:push web -a "$APP"

step "Release"
heroku container:release web -a "$APP"

# ---- Vérification ----------------------------------------------------------
API_ROOT="https://$APP.herokuapp.com"
API_BASE="$API_ROOT/api/v1"
step "Vérification de santé"
info "Attente du démarrage (migrations + seed)…"
ok=""
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/healthz" || true)"
  if [ "$code" = "200" ]; then ok="yes"; break; fi
  sleep 3
done
if [ -n "$ok" ]; then
  echo "${BOLD}✓ API en ligne :${RST} $API_BASE/healthz"
else
  echo "${BOLD}⚠ Pas de réponse 200 pour l'instant.${RST} Vérifie les logs : heroku logs --tail -a $APP"
fi

# ---- Branchement du front --------------------------------------------------
step "Brancher le front (GitHub Pages) sur cette API"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  info "Définition de la variable de dépôt BMX_API_URL via gh…"
  gh variable set BMX_API_URL --body "$API_BASE" --repo "$GH_REPO" \
    && info "Variable posée sur $GH_REPO." \
    || info "Échec gh — fais-le à la main (voir ci-dessous)."
else
  cat <<EOF
  Définis la variable de dépôt (Settings → Secrets and variables → Actions → Variables) :

      ${BOLD}BMX_API_URL = $API_BASE${RST}

  …ou, si tu as le CLI gh :
      gh variable set BMX_API_URL --body "$API_BASE" --repo "$GH_REPO"
EOF
fi

echo
echo "${BOLD}🚲 Déploiement terminé.${RST}"
echo "   API   : $API_BASE"
echo "   Logs  : heroku logs --tail -a $APP"
echo "   Front : relance le déploiement Pages (push sur main ou « Run workflow »)"
echo "           pour injecter l'URL dans le build."
echo
echo "${DIM}Astuce admin : pour valider des spots / créer des sondages, passe ton"
echo "compte en admin après inscription :"
echo "   heroku pg:psql -a $APP -c \"UPDATE users SET role='admin' WHERE email='ton@email';\"${RST}"
