#!/usr/bin/env bash
# Déploiement bmx sur Heroku — Option A : une seule app (container) où le
# backend Rust sert l'API ET le front Vue.
#
# Usage :
#   ./deploy.sh <nom-app-heroku>
#   HEROKU_APP=mon-app ./deploy.sh
#
# Options (variables d'env) :
#   BRANCH=main                 branche à déployer (défaut : main)
#   PG_PLAN=essential-0         plan Heroku Postgres (défaut : essential-0)
#   JWT_SECRET=...              sinon généré automatiquement (si pas déjà défini)
#   ADMIN_EMAIL=... ADMIN_PASS=...  crée un compte admin après le déploiement
#
# Pré-requis : Heroku CLI installé et connecté (`heroku login`), exécuté depuis
# la racine du repo (un dépôt git avec le code mergé).

set -euo pipefail

BOLD=$(printf '\033[1m'); GREEN=$(printf '\033[32m'); YEL=$(printf '\033[33m')
RED=$(printf '\033[31m'); RST=$(printf '\033[0m')
info() { echo "${BOLD}▶ $*${RST}"; }
ok()   { echo "${GREEN}✓ $*${RST}"; }
warn() { echo "${YEL}⚠ $*${RST}"; }
die()  { echo "${RED}✗ $*${RST}" >&2; exit 1; }

APP="${1:-${HEROKU_APP:-}}"
BRANCH="${BRANCH:-main}"
PG_PLAN="${PG_PLAN:-essential-0}"

[ -n "$APP" ] || die "Nom d'app manquant. Usage : ./deploy.sh <nom-app-heroku>"
command -v heroku >/dev/null 2>&1 || die "Heroku CLI introuvable — installe-le : https://devcenter.heroku.com/articles/heroku-cli"
command -v git >/dev/null 2>&1 || die "git introuvable"
heroku whoami >/dev/null 2>&1 || die "Pas connecté à Heroku — lance d'abord : heroku login"
heroku apps:info -a "$APP" >/dev/null 2>&1 || die "App Heroku '$APP' introuvable (vois \`heroku apps\`)"

ok "App : $APP — branche : $BRANCH"

# 1) Stack container ----------------------------------------------------------
CUR_STACK=$(heroku stack -a "$APP" 2>/dev/null | grep -E '^\* ' | awk '{print $2}' || true)
if [ "$CUR_STACK" = "container" ]; then
  ok "Stack déjà 'container'"
else
  info "Passage de l'app en stack container…"
  heroku stack:set container -a "$APP"
  ok "Stack → container"
fi

# 2) PostgreSQL ---------------------------------------------------------------
if heroku addons -a "$APP" 2>/dev/null | grep -qi heroku-postgresql; then
  ok "Postgres déjà attaché"
else
  info "Création de Heroku Postgres ($PG_PLAN)…"
  heroku addons:create "heroku-postgresql:$PG_PLAN" -a "$APP"
  ok "Postgres créé (DATABASE_URL fourni automatiquement)"
fi

# 3) JWT_SECRET ---------------------------------------------------------------
if heroku config:get JWT_SECRET -a "$APP" | grep -q .; then
  ok "JWT_SECRET déjà défini"
else
  SECRET="${JWT_SECRET:-}"
  if [ -z "$SECRET" ]; then
    if command -v openssl >/dev/null 2>&1; then SECRET=$(openssl rand -hex 32)
    else SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'); fi
  fi
  info "Définition de JWT_SECRET…"
  heroku config:set JWT_SECRET="$SECRET" -a "$APP"
  ok "JWT_SECRET défini"
fi

# 4) Remote git + déploiement -------------------------------------------------
if ! git remote get-url heroku >/dev/null 2>&1; then
  info "Ajout du remote git 'heroku'…"
  heroku git:remote -a "$APP"
fi
info "Déploiement de '$BRANCH' (build Docker : Vue + Rust, quelques minutes)…"
git push heroku "$BRANCH:main"
ok "Déploiement terminé"

# 5) Compte admin (optionnel) -------------------------------------------------
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASS:-}" ]; then
  info "Création du compte admin $ADMIN_EMAIL…"
  heroku run "api admin:create '$ADMIN_EMAIL' '$ADMIN_PASS'" -a "$APP"
  ok "Admin créé"
else
  warn "Pas de compte admin créé. Pour en créer un :"
  echo "    heroku run \"api admin:create ton@email.com 'MotDePasse!'\" -a $APP"
fi

URL=$(heroku apps:info -a "$APP" 2>/dev/null | grep -E '^Web URL:' | awk '{print $3}' || echo "https://$APP.herokuapp.com/")
echo
ok "En ligne : $URL"
echo "   Le front et l'API (/api/v1) sont servis par la même app."
echo "   Logs : heroku logs --tail -a $APP"
