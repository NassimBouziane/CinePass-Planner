# Conception : Planificateur de Journée Cinéma Pathé CinéPass (CinéPass Planner)

**Date :** 11 Octobre 2026  
**Auteur :** Antigravity  
**Statut :** Validé après revue technique

---

## 1. Contexte & Intention (The Why)

Les abonnés au pass cinéma Pathé (CinéPass -26, Silver, Gold) souhaitent rentabiliser au maximum leur abonnement en organisant des "marathons cinéma" de 1 à 5+ films sur une journée.
Cependant, concevoir manuellement un planning sans chevauchement, en tenant compte des durées exactes des films, des temps de transition entre les salles, des pauses repas et de leurs films préférés relève du casse-tête. De plus, interroger les APIs cinéma en direct à chaque calcul entraîne une latence et un risque de blocage.

L'objectif est de créer une application Python (gérée avec `uv`) adossée à une base de données **SQLite locale**, synchronisée chaque semaine avec Allociné (`allocine-seances`) et l'intégralité du réseau officiel des cinémas éligibles au CinéPass (`ReseauCinePassCineCartes.pdf`). L'application permet de générer instantanément des propositions de plannings optimisés via une double interface : **CLI interactive** (Typer/Rich) et **Web** (Streamlit).

---

## 2. Objectifs, Non-Objectifs & Anti-Objectifs

### Objectifs (Goals)
1. **Périmètre complet du réseau CinéPass :** Intégrer l'intégralité des cinémas éligibles au CinéPass présents dans le document PDF officiel (`ReseauCinePassCineCartes.pdf`), soit :
   - Les cinémas officiels du circuit Pathé / Gaumont (`circuit-81002`, ~78 cinémas).
   - Les cinémas indépendants partenaires acceptant le CinéPass (ex. Max Linder, 7 Parnassiens, Cinéma du Panthéon, Le Balzac, Le Mazarin, etc.).
   - Un fichier de mapping (`data/cinemas_mapping.json`) assurera la correspondance précise entre les noms du PDF et les identifiants Allociné correspondants.
2. **Stockage & Cache SQLite :** Modéliser et alimenter une base SQLite locale pour stocker les cinémas, les films (titre, durée, genres, affiche, réalisateur) et les séances hebdomadaires (horaires, version VF/VOST, format Dolby/Laser/IMAX/4DX).
3. **Synchronisation ciblée & hebdomadaire :** 
   - Synchronisation à la demande ultra-rapide par cinéma ou agglomération sélectionnée (~3 secondes pour 7 jours de séances d'un cinéma).
   - Détection de fraîcheur hebdomadaire (mercredi = nouvelle semaine cinéma).
4. **Moteur d'ordonnancement (Scheduler Core) :** Un algorithme d'exploration de créneaux (backtracking avec élagage) capable de composer des journées cinéma selon des contraintes strictes :
   - Cinéma sélectionné et date voulue.
   - Nombre de films visé (dynamique : 1, 2, 3, 4, 5+).
   - Amplitude horaire (heure de départ au plus tôt, heure de fin max).
   - Films prioritaires (ciblés en priorité dans la combinaison).
   - Prise en compte de la formule d'abonnement (Gold, Silver, -26 ans, etc.) :
     * Sélection du type de pass par l'utilisateur.
     * Choix explicite par case à cocher : "Accepter les séances avec supplément tarifaire (IMAX, 4DX, Dolby Cinema...)" ou "Uniquement les séances 100% incluses sans supplément".
     * Si formule Gold : formats premium toujours inclus à 0 €.
     * Si formule Silver / -26 : si l'option supplément est décochée, les séances premium payantes sont filtrées ; si cochée, elles sont autorisées et signalées par un badge `+Supplément`.
   - Intervalle minimum de confort entre deux séances (par défaut 15 min).
   - Gestion optionnelle d'une pause repas / détente (ex: 45 min à 1h30 entre 12h et 14h ou 19h et 21h).
5. **Double interface (Option C) :**
   - **CLI (Typer + Rich) :** Commandes pour synchroniser, lister les cinémas, et générer les journées avec de superbes tableaux colorés.
   - **Interface Web (Streamlit) :** Application moderne au thème sombre "salle de cinéma", avec formulaire dynamique, sélecteur de films cibles et affichage visuel des déroulés de journée.

### Non-Objectifs (Non-Goals v1)
- **Gestion des trajets inter-cinémas :** L'utilisateur a explicitement demandé de ne pas gérer de déplacements complexes pour l'instant (la journée se déroule au sein d'un même cinéma ou cinémas immédiatement voisins).
- **Réservation automatique de billets :** L'application n'effectue pas d'authentification sur le compte Pathé de l'utilisateur pour réserver les sièges (réservation manuelle par l'utilisateur via l'app Pathé).

### Anti-Objectifs (Anti-Goals)
- **Aucun appel réseau au moment de la planification :** Le moteur de calcul lit exclusivement dans SQLite pour garantir une vitesse instantanée sans latence.
- **Zéro chevauchement :** Deux séances ne peuvent jamais se superposer dans un même planning.

---

## 3. Architecture Technique & Choix Technologiques

### 3.1 Dépendances & Environnement (`pyproject.toml` avec `uv`)
- **Python :** `>= 3.12`
- **Gestionnaire :** `uv`
- **Package Allociné :** `allocine-seances` (`0.0.14`), fournissant le module `allocineAPI.allocineAPI`.
- **Extraction PDF :** `pypdf` pour extraire les cinémas éligibles de `pathe_cinemas.pdf`.
- **Base de données :** `sqlite3` avec mode WAL (`PRAGMA journal_mode=WAL;`).
- **CLI :** `typer` + `rich` pour une expérience terminal interactive et colorée.
- **Web UI :** `streamlit` pour l'interface graphique.
- **Tests :** `pytest`.

### 3.2 Modèle de Données SQLite

```sql
-- Cinémas éligibles au CinéPass (Pathé + Indépendants partenaires)
CREATE TABLE IF NOT EXISTS cinemas (
    id TEXT PRIMARY KEY,               -- Identifiant Allociné (ex: 'B0143', 'P0036')
    name TEXT NOT NULL,                -- Nom du cinéma
    city TEXT,                         -- Agglomération / Ville
    address TEXT,                      -- Adresse
    group_type TEXT,                   -- 'Les Cinémas Pathé' ou 'Cinéma indépendant'
    accepts_gold BOOLEAN DEFAULT 1,
    accepts_silver BOOLEAN DEFAULT 1,
    accepts_under26 BOOLEAN DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Films au catalogue
CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,               -- Titre ou identifiant Allociné
    title TEXT NOT NULL,
    original_title TEXT,
    runtime_minutes INTEGER NOT NULL,  -- Durée convertie en minutes (ex: "1h 52min" -> 112)
    genres TEXT,                       -- JSON string ['Action', 'Drame']
    director TEXT,
    poster_url TEXT,
    synopsis TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Séances programmées
CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cinema_id TEXT NOT NULL,
    movie_title TEXT NOT NULL,
    starts_at TEXT NOT NULL,           -- Format ISO: 'YYYY-MM-DDTHH:MM:SS'
    ends_at TEXT NOT NULL,             -- starts_at + runtime_minutes
    date_str TEXT NOT NULL,            -- 'YYYY-MM-DD'
    version TEXT,                      -- 'ORIGINAL' (VOST), 'DUBBED' (VF)
    format TEXT,                       -- 'Standard', 'Dolby Cinema', 'IMAX', '4DX', 'Laser'
    screen_name TEXT,
    FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
);

CREATE INDEX IF NOT EXISTS idx_showtimes_lookup ON showtimes(cinema_id, date_str, starts_at);

-- Métadonnées de synchronisation
CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cinema_id TEXT,
    date_str TEXT,
    status TEXT,
    entries_count INTEGER
);
```

---

## 4. Algorithme d'Ordonnancement (Planning Core Engine)

1. **Extraction des séances candidates :**
   - Récupération des séances du cinéma sélectionné pour la date choisie dans la fenêtre `[heure_debut, heure_fin]`.
   - Filtrage éventuel des formats spéciaux selon la formule CinéPass si l'utilisateur souhaite éviter les suppléments tarifaires.
2. **Construction des combinaisons valides de $N$ films (Backtracking récursif) :**
   - Soit $S = [s_1, s_2, \dots, s_N]$ une séquence ordonnée par heure de début.
   - Contrainte 1 : Aucun doublon de film ($s_k \ne s_j$).
   - Contrainte 2 : $\text{starts\_at}(s_{k+1}) \ge \text{ends\_at}(s_k) + \text{buffer\_min}$ ($\ge 15$ min).
   - Contrainte 3 : Respect de la pause repas (déjeuner 12h-14h ou dîner 19h-21h) si cochée.
3. **Scoring et Évaluation des Itinéraires :**
   - Priorité maximale aux films favoris sélectionnés.
   - Minimisation des temps d'attente morts non désirés.
   - Renvoi de jusqu'à 3 propositions distinctes (ex: 1. Optimale Matinée/Après-midi, 2. Démarrage début d'après-midi, 3. Version intensive).

---

## 5. Structure du Code Source

```
cinepass_planning/
├── pyproject.toml
├── README.md
├── pathe_cinemas.pdf                  # PDF source officiel du réseau
├── data/
│   ├── cinemas_mapping.json           # Référentiel des cinémas PDF <-> Allociné
│   └── cinepass.db                    # Base de données SQLite locale
├── src/
│   └── cinepass_planner/
│       ├── __init__.py
│       ├── config.py                  # Constantes, chemins de données, durées par défaut
│       ├── db/
│       │   ├── __init__.py
│       │   ├── connection.py          # Connexion SQLite et gestion des transactions
│       │   └── schema.py              # DDL des tables et index
│       ├── models.py                  # Dataclasses Cinema, Movie, Showtime, Itinerary, PassType
│       ├── importer/
│       │   ├── __init__.py
│       │   ├── pdf_parser.py          # Parser PDF pour extraire le réseau complet
│       │   ├── allocine_client.py     # Wrapper allocineAPI robuste avec gestion d'erreurs
│       │   └── sync_service.py        # Synchronisation ciblée & hebdomadaire
│       ├── core/
│       │   ├── __init__.py
│       │   ├── scheduler.py           # Algorithme d'ordonnancement par backtracking
│       │   └── parser_utils.py        # Conversion "1h 52min" -> minutes, calculs de créneaux
│       ├── cli/
│       │   ├── __init__.py
│       │   └── main.py                # Commandes Typer (plan, sync, cinemas, movies)
│       └── web/
│           ├── __init__.py
│           └── app.py                 # Application Streamlit au thème Dark Cinema
└── tests/
    ├── test_parser_utils.py
    ├── test_scheduler.py
    ├── test_db.py
    └── test_pdf_parser.py
```

---

## 6. Décisions Prises

- **Décisions du demandeur :**
  - Utilisation de Python avec `uv`.
  - Package `allocineAPI` (`allocine-seances`).
  - Base SQLite locale pour un fonctionnement instantané.
  - Réseau complet : **tous les cinémas du CinéPass** (Pathé + cinémas indépendants partenaires du PDF).
  - Option C : Moteur partagé + CLI interactive + Interface Web Streamlit.
  - Nombre de films paramétrable dynamiquement (1 à 5+ films).
  - Pas de trajets inter-cinémas en v1 (même cinéma).
  - Design sombre façon salle de cinéma.
- **Décisions du concepteur (Agent) :**
  - Synchronisation ciblée par cinéma/agglomération (~3s) pour une réactivité immédiate sans risque de blocage réseau.
  - Fichier de référentiel `cinemas_mapping.json` pour garantir que 100% des cinémas du PDF sont résolus et exploitables avec Allociné.
  - Gestion des formules CinéPass (Gold, Silver, -26) : badges sur les formats spéciaux (IMAX, 4DX, Dolby) et filtre optionnel sans supplément.
  - Algorithme de backtracking avec élagage pour générer les 3 meilleures propositions d'itinéraires.
