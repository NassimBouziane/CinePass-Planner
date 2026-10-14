#!/usr/bin/env bash
# ==============================================================================
# CinéPass Planner - Pipeline de synchronisation, export et build
# Utilisable en local pour le développement et dans la CI GitHub Actions.
# ==============================================================================

set -euo pipefail

# Couleurs pour le terminal
if [[ -t 1 ]]; then
  BOLD="\033[1m"
  GREEN="\033[0;32m"
  BLUE="\033[0;34m"
  YELLOW="\033[0;33m"
  RED="\033[0;31m"
  RESET="\033[0m"
else
  BOLD=""
  GREEN=""
  BLUE=""
  YELLOW=""
  RED=""
  RESET=""
fi

log_info() {
  echo -e "${BLUE}${BOLD}[INFO]${RESET} $1"
}

log_success() {
  echo -e "${GREEN}${BOLD}[SUCCESS]${RESET} $1"
}

log_warn() {
  echo -e "${YELLOW}${BOLD}[WARN]${RESET} $1"
}

log_error() {
  echo -e "${RED}${BOLD}[ERROR]${RESET} $1" >&2
}

# Assurer que le script s'exécute depuis la racine du projet
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Assurer que ~/.local/bin et les chemins uv standards sont dans le PATH
for p in "$HOME/.local/bin" "/c/Users/${USER:-}/.local/bin" "${USERPROFILE:-}/.local/bin"; do
  if [[ -n "$p" && -d "$p" && ":$PATH:" != *":$p:"* ]]; then
    export PATH="$p:$PATH"
  fi
done

# Options par défaut
DAYS=5
LIMIT=""
BATCH_SIZE=15
FORCE=false
SKIP_SEED=false
SKIP_SYNC=false
SKIP_EXPORT=false
INSTALL_DEPS=false
BUILD_WEB=false
OUTPUT_DIR="web/public/data"
MIN_DELAY=0.5
MAX_DELAY=2.0

show_help() {
  cat << EOF
${BOLD}Usage:${RESET} $0 [OPTIONS]

Pipeline d'initialisation, de synchronisation des séances et de build du site statique.

${BOLD}Options:${RESET}
  -d, --days <N>       Nombre de jours de séances à synchroniser depuis Allociné (défaut: 5)
  -b, --batch-size <N> Nombre max de cinémas à synchroniser par lot (défaut: 15)
  -l, --limit <N>      Limiter la synchronisation à N cinémas (idéal pour tester rapidement)
  -f, --force          Forcer la synchronisation même si les séances du jour sont déjà fraîches
  --min-delay <sec>    Délai minimal aléatoire entre requêtes cinémas (défaut: 0.5)
  --max-delay <sec>    Délai maximal aléatoire entre requêtes cinémas (défaut: 2.0)
  --skip-seed          Passer l'étape d'initialisation du registre des cinémas depuis le PDF
  --skip-sync          Passer l'étape de synchronisation Allociné (utilise la base SQLite locale existante)
  --skip-export        Passer l'étape d'export des fichiers JSON statiques
  -w, --build-web      Construire le site statique Astro après l'export des données
  -i, --install-deps   Installer les dépendances Python (uv sync) et web (npm install)
  -o, --output <dir>   Répertoire de destination pour les JSON exportés (défaut: web/public/data)
  -h, --help           Afficher cette aide et quitter

${BOLD}Exemples:${RESET}
  # Lancement standard en local (synchronise et exporte les données)
  $0

  # Développement rapide en local (utilise la base SQLite sans requêter Allociné)
  $0 --skip-sync

  # Test rapide sur 2 cinémas et 3 jours avec build Astro
  $0 --limit 2 --days 3 --build-web

  # Mode CI complet (synchronise 8 jours et compile le frontend)
  $0 --days 8 --build-web
EOF
}

# Parsing des arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--days)
      DAYS="$2"
      shift 2
      ;;
    -l|--limit)
      LIMIT="$2"
      shift 2
      ;;
    -b|--batch-size)
      BATCH_SIZE="$2"
      shift 2
      ;;
    -f|--force)
      FORCE=true
      shift
      ;;
    --min-delay)
      MIN_DELAY="$2"
      shift 2
      ;;
    --max-delay)
      MAX_DELAY="$2"
      shift 2
      ;;
    --skip-seed)
      SKIP_SEED=true
      shift
      ;;
    --skip-sync)
      SKIP_SYNC=true
      shift
      ;;
    --skip-export)
      SKIP_EXPORT=true
      shift
      ;;
    -w|--build-web)
      BUILD_WEB=true
      shift
      ;;
    -i|--install-deps)
      INSTALL_DEPS=true
      shift
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      log_error "Option inconnue : $1"
      show_help
      exit 1
      ;;
  esac
done

# Vérification des prérequis
if ! command -v uv &> /dev/null; then
  log_error "L'outil 'uv' n'a pas été trouvé dans le PATH. Veuillez l'installer : https://docs.astral.sh/uv/"
  exit 1
fi

log_info "Démarrage du pipeline CinéPass Planner..."

# 0. Installation des dépendances si demandée
if [[ "$INSTALL_DEPS" == true ]]; then
  log_info "Installation des dépendances Python via uv sync..."
  uv sync
  if [[ "$BUILD_WEB" == true || -d "web" ]]; then
    log_info "Installation des dépendances web via npm install..."
    (cd web && npm install)
  fi
fi

# 1. Initialisation / Seed du registre des cinémas depuis le PDF officiel
if [[ "$SKIP_SEED" == true ]]; then
  log_info "Étape 1/4 : Initialisation du registre ignorée (--skip-seed)."
else
  log_info "Étape 1/4 : Initialisation et vérification du registre des cinémas (PDF officiel)..."
  uv run python scripts/seed_database.py
  log_success "Registre des cinémas initialisé."
fi

# 2. Synchronisation des séances depuis l'API Allociné
if [[ "$SKIP_SYNC" == true ]]; then
  log_info "Étape 2/4 : Synchronisation Allociné ignorée (--skip-sync)."
else
  SYNC_CMD=(uv run cinepass sync-all --days "$DAYS" --batch-size "$BATCH_SIZE" --min-delay "$MIN_DELAY" --max-delay "$MAX_DELAY")
  if [[ -n "$LIMIT" ]]; then
    SYNC_CMD+=(--limit "$LIMIT")
  fi
  if [[ "$FORCE" == true ]]; then
    SYNC_CMD+=(--force)
  fi

  log_info "Étape 2/4 : Synchronisation des séances Allociné (sur $DAYS jours)..."
  "${SYNC_CMD[@]}"
  log_success "Séances synchronisées avec succès."
fi

# 3. Export des données SQLite vers des fichiers JSON statiques
if [[ "$SKIP_EXPORT" == true ]]; then
  log_info "Étape 3/4 : Export statique JSON ignoré (--skip-export)."
else
  log_info "Étape 3/4 : Exportation des données statiques vers $OUTPUT_DIR..."
  uv run python scripts/export_static_data.py --output "$OUTPUT_DIR"
  log_success "Exportation JSON terminée."
fi

# 4. Build du site statique Astro (si demandé)
if [[ "$BUILD_WEB" == true ]]; then
  log_info "Étape 4/4 : Compilation du site statique Astro (npm run build)..."
  if ! command -v npm &> /dev/null; then
    log_error "Node.js / npm n'est pas installé ou introuvable dans le PATH."
    exit 1
  fi
  if [[ ! -d "web/node_modules" ]]; then
    log_info "Installation des modules web nécessaires..."
    (cd web && npm install)
  fi
  (cd web && npm run build)
  log_success "Site statique Astro généré avec succès dans web/dist/."
else
  log_info "Étape 4/4 : Build Astro non demandé (ajoutez --build-web pour générer le site web)."
fi

log_success "Pipeline terminé avec succès !"
