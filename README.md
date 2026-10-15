# CinéPass Planner

> Planificateur de marathons cinématographiques pour les abonnés CinéPass (Gold, Silver, -26 ans). Application indépendante non affiliée à Pathé.

---

## Préambule

Ce projet est un projet personnel ("pet project") développé avec l'assistance d'une IA (**Gemini 3.8 Flash** via **Antigravity CLI**). 

L'objectif de cette démarche est d'expérimenter les méthodologies récentes de développement logiciel piloté par agents autonomes, J'ai quand même designé toute l'architecture et une relecture entière du code est en cours.

---

## Présentation

CinéPass Planner résout un problème classique des cinéphiles réguliers : organiser une journée continue de cinéma (2 à 5+ films d'affilée) sans chevauchement horaire, tout en tenant compte :
- Des durées exactes des films et des bandes-annonces (tampon de début de séance de 15 minutes).
- Des temps de battement minimaux entre les salles et entre les différents cinémas partenaires.
- De la pause repas obligatoire ou optionnelle (fenêtre déjeuner 12h-14h ou dîner 19h-21h d'au moins 45 minutes).
- De la formule d'abonnement (prise en charge des suppléments pour formats spéciaux IMAX, 4DX, Dolby Cinema, ScreenX).
- Des versions linguistiques (VOSTFR, VF) et des formats de projection sélectionnés.
- D'une liste de films prioritaires (coups de cœur) et d'une liste de films déjà vus à écarter de la planification.
- De l'export direct de la journée au format calendrier standard (.ics).

---

## Stack Technique

- **Ingestion & Données (Python 3.12) :**
  - `uv` : gestionnaire d'environnement et de dépendances.
  - `SQLite` : stockage local des cinémas et des séances.
  - `allocine-seances` : récupération des programmations Allociné, basé sur le package open-source [AllocineAPI](https://github.com/lefevre-dev/AllocineAPI).

- **Frontend & Moteur de Calcul (TypeScript / Astro) :**
  - `Astro 7` : générateur de site statique (SSG) sans serveur runtime.
  - `Tailwind CSS 4` : design Neobrutalism (bordures 2px, ombres franches, typographie monospace).

- **CI/CD & Déploiement :**
  - `GitHub Actions` : synchronisation hebdomadaire automatisée et hébergement GitHub Pages.
  - `scripts/pipeline.sh` : script bash unifié pour exécuter le pipeline en local et en CI.

- **IA & Skills :**
  - `Antigravity CLI`: Gemini 3.8 Flash
  - `Skills` : 
    - [Superpowers](https://github.com/obra/superpowers)
    - Custom [neobrutalism skill](https://github.com/NassimBouziane/CinePass-Planner/blob/main/.agents/skills/neobrutalism-cine/SKILL.md) pour le visuel

---

## Installation et Prérequis

### Prérequis
- Python 3.12 ou supérieur
- Gestionnaire [uv](https://docs.astral.sh/uv/)
- Node.js 20 ou supérieur avec `npm`
- Git

### Installation des dépendances

```bash
# Installation des dépendances Python
uv sync

# Installation des dépendances Web
cd web && npm install && cd ..
```

---

## Pipeline de Données et Déploiement

Le script shell `scripts/pipeline.sh` automatise l'ensemble de la chaîne de traitement, en local comme dans la CI GitHub Actions.

### Commandes principales

```bash
# Pipeline complet : seed du registre, synchronisation Allociné (8 jours) et export JSON
bash scripts/pipeline.sh

# Mode développement rapide : réutilise la base SQLite locale sans requêter l'API Allociné
bash scripts/pipeline.sh --skip-sync

# Pipeline complet avec compilation du site statique Astro
bash scripts/pipeline.sh --days 8 --build-web

# Test restreint sur 2 cinémas et 3 jours
bash scripts/pipeline.sh --limit 2 --days 3

# Forcer la synchronisation même si les données du jour sont récentes
bash scripts/pipeline.sh --force
```

### Options du script `pipeline.sh`
- `-d, --days <N>` : Nombre de jours à synchroniser (défaut : 8).
- `-l, --limit <N>` : Limite le nombre de cinémas à traiter (utile pour les tests rapides).
- `-f, --force` : Force la mise à jour des séances sans tenir compte du cache de fraîcheur.
- `--skip-seed` : Ignore l'étape de lecture du PDF et d'initialisation de la base.
- `--skip-sync` : Ignore l'étape de scraping Allociné.
- `--skip-export` : Ignore l'étape d'export JSON.
- `-w, --build-web` : Exécute `npm run build` dans le répertoire `web/`.
- `-i, --install-deps` : Exécute `uv sync` et `npm install` avant le traitement.
- `-o, --output <dir>` : Répertoire de sortie des fichiers JSON (défaut : `web/public/data`).

---

## Utilisation de l'Interface Web

L'interface web statique peut être lancée localement en mode développement :

```bash
cd web
npm run dev
```

L'application est alors accessible sur `http://localhost:4321`.

Fonctionnalités disponibles dans l'interface :
- Recherche textuelle rapide de cinémas et sélection multi-cinémas.
- Filtrage par date, créneau horaire, durée de pause minimale et pause déjeuner/dîner.
- Filtrage par version (Toutes, VOSTFR, VF) et formats techniques (Standard, IMAX, Dolby Cinema, 4DX, ScreenX).
- Sélection de films prioritaires et recherche dans la programmation du jour.
- Exclusion de films déjà vus d'un simple clic ("déjà vu ?") avec retrait immédiat des propositions.
- Visualisation du marathon sous forme de timeline avec affiches en miniature et lightbox haute résolution.
- Ticket thermique récapitulatif avec estimation des suppléments éventuels et export direct du calendrier `.ics`.
- Mémorisation automatique de l'ensemble de vos choix via `localStorage`.

---

## Utilisation en Ligne de Commande (CLI)

Le binaire CLI `cinepass` est directement accessible via `uv run` :

### 1. Consulter les cinémas du réseau
```bash
# Lister l'ensemble des cinémas éligibles
uv run cinepass cinemas

# Filtrer par ville
uv run cinepass cinemas --city Paris
uv run cinepass cinemas --city Lyon
```

### 2. Synchroniser les séances
```bash
# Synchroniser un cinéma spécifique par son code Allociné ou son nom
uv run cinepass sync --cinema W7502 --days 7
uv run cinepass sync --cinema "Pathé Beaugrenelle"

# Synchroniser l'ensemble des cinémas du réseau
uv run cinepass sync-all --days 8
```

### 3. Calculer un marathon de séances
```bash
# Marathon de 3 films à Pathé Beaugrenelle le 18 octobre entre 10h00 et 22h30
uv run cinepass plan --cinema W7502 --date 2026-10-18 --films 3 --start 10:00 --end 22:30

# Spécifier une formule Silver et refuser les suppléments tarifaires
uv run cinepass plan --cinema W7502 --films 3 --pass Silver --no-supplements
```

---

## Tests et Assurance Qualité

Le projet intègre une suite de tests automatisés couvrant le backend Python et le frontend TypeScript :

```bash
# Exécution des tests Python (pytest)
uv run pytest -v

# Exécution des tests Web (vitest)
npm --prefix web run test

# Validation de la compilation statique (Astro build)
npm --prefix web run build
```

---

## Licence

Ce projet est distribué sous licence MIT. Les données de programmation et affiches restent la propriété de leurs ayants droit respectifs et du réseau Pathé / Allociné.
