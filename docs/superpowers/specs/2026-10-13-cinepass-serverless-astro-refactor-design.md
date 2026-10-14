# Architecture & Design Document: Cinepass Planner Serverless Astro.js Refactor

**Date:** 2026-10-13  
**Status:** In Review  
**Target:** Replace Streamlit with a static Astro.js + Tailwind CSS web application deployed on GitHub Pages with automated weekly GitHub Actions data sync.

---

## 1. Intent & The Why

The original prototype utilized Streamlit for fast UI validation. However, Streamlit requires a persistent, stateful Python server process with continuous WebSocket connections, which prevents free, serverless hosting on static platforms like GitHub Pages.

The goal of this refactor is to:
1. Turn CinéPass Planner into an **accessible, public, zero-cost serverless website** hosted on **GitHub Pages**.
2. Decouple data synchronization from user interaction: a **shared database** populated weekly every Tuesday morning via **GitHub Actions** (when cinemas publish the new cinema week schedules).
3. Deliver the exact same **Dark Cinema user experience**, planning form, constraints (meal breaks, buffer times, cinema switching notes, pass formulas, languages, format filters), and responsive performance by executing the scheduling algorithm directly client-side in TypeScript.
4. Retire and remove Streamlit from the codebase.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Static & Serverless:** Deployable to GitHub Pages with 0 backend servers, 0 monthly infrastructure cost, and unlimited scalability.
- **Modern & Lightweight UI:** Built with **Astro.js** and **Tailwind CSS**, matching the dark cinema aesthetic already validated in Streamlit.
- **Client-Side Engine:** Faithful port of the backtrack search scheduler to TypeScript, tested with Vitest, running in < 50ms in the user's browser.
- **Weekly Automated Sync:** A GitHub Actions workflow executing on schedule (Tuesdays) to fetch showtimes via Python Allociné client, export sanitized static JSON data, build Astro, and deploy to GitHub Pages.
- **Persistence:** Save all user preferences (city, selected cinemas, pass type, sliders, meal break, formats, language) in `localStorage` and synchronize with URL parameters (`?city=...&pass=...`).
- **Clean Deprecation:** Completely remove Streamlit dependencies and files.

### Non-Goals
- Real-time Allociné API calls from the visitor's browser (all showtime data is compiled once per week by the GitHub Action to prevent CORS, rate-limiting, and slow load times).
- User accounts, server authentication, or cloud database services (Vercel, AWS Lambda, Turso, Supabase).
- Live cinema seat booking (only itinerary planning and links to Allociné/Pathé booking).

### Anti-Goals
- Regressing on core planning features: meal breaks (12h-14h and 19h-21h), minimum buffer transitions, cinema change notices (`🚶 Changement de cinéma`), language preferences (VOST/VF), and signature format badges (`✨ IMAX`, `🎬 Dolby Cinema`, `⚡ 4DX`, `📐 ScreenX`, `🔊 Dolby Atmos`, `📺 Onyx LED`, `👓 3D`, `Standard`) must all remain intact.
- Bloating the frontend with heavy JavaScript bundles.

---

## 3. Constraints

- **Hosting:** 100% static on GitHub Pages (`gh-pages` / GitHub Actions deployment).
- **Tooling:**
  - Python >= 3.12 managed via `uv` for CLI and batch data extraction.
  - Node.js >= 20 (local environment is Node v23.6.0 + npm 11.0.0).
- **User Preference on Git:** Native local implementation, **NO git commits** for now (per explicit user instruction: *"Native mais pas de commit pour l'instant"*). All files created on disk, but no `git commit` command issued.

---

## 4. System Architecture

```
                                  [ GitHub Action (Every Tuesday 04:00 UTC) ]
                                                       │
                                 1. Run uv run cinepass sync --all (Python)
                                 2. Run python scripts/export_static_data.py
                                                       │
                                                       ▼
                                         [ Static JSON Data Artifacts ]
                                            - cinemas.json
                                            - showtimes-<date>.json
                                                       │
                                                       ▼
                                 3. Run npm run build (Astro + Tailwind)
                                 4. Deploy to GitHub Pages
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │   Visitor Browser (GitHub Pages) │
                                      │                                 │
                                      │  - Astro Static Shell           │
                                      │  - Tailwind Dark Cinema UI      │
                                      │  - Client TypeScript Scheduler  │
                                      │  - LocalStorage Preferences     │
                                      └─────────────────────────────────┘
```

---

## 5. Detailed Component Breakdown

### 5.1 Python Backend & Data Exporter
The Python backend remains the robust engine for Allociné API querying, cinema network registry parsing, and SQLite caching.

- **Retained Components:**
  - `src/cinepass_planner/importer/allocine_client.py`: API calls and format detection (`determine_showtime_format`).
  - `src/cinepass_planner/importer/sync_service.py`: Multi-day synchronization and cache freshness tracking.
  - `src/cinepass_planner/importer/pdf_parser.py`: Official Pathé network cinema parsing.
  - `src/cinepass_planner/db/repositories.py` & `schema.py`: SQLite storage.
  - `src/cinepass_planner/cli/main.py`: Command-line interface (`cinepass cinemas`, `cinepass sync`, `cinepass plan`).
- **New Component: Static Data Exporter (`scripts/export_static_data.py` or `src/cinepass_planner/exporter/export_static_data.py`):**
  - Reads from `data/cinepass.db`.
  - Outputs to `web/public/data/` (or `web/dist/data/`):
    - `cinemas.json`: Compact array of cinemas: `{ id, name, city, group_type, accepts_gold, accepts_silver, accepts_under26, formats: [...] }`.
    - `dates.json`: Array of available date strings (`["2026-10-13", "2026-10-14", ...]`).
    - `showtimes-<date>.json`: Showtimes grouped by cinema ID: `{ [cinemaId]: [ { movie_title, starts_at, ends_at, version, format, runtime_minutes } ] }`.
    - Compact payload size: Gzipped < 150 KB for all cinemas in France over 7 days.

### 5.2 Frontend Web App (Astro.js + Tailwind CSS)
Located in directory `web/`:
- **Astro Configuration:**
  - `output: 'static'`, standalone single-page application structure.
  - `@astrojs/tailwind` configured with dark cinema theme:
    - Primary dark background: `#0d1117`
    - Card surface: `#161b22`
    - Card hover/slot: `#1c2128`
    - Gold accent: `#f5c518` / `#ffd700`
    - Borders: `#30363d`
- **UI Components (Modular & Refactorable):**
  1. `Header.astro`: Dark cinema branding, Pathé network badge, subtitle.
  2. `FilterSidebar`:
     - Agglomeration select (`Toutes`, `Paris`, etc.)
     - Equipment filter (`Tous équipements`, `Dolby Cinema`, `IMAX`, `4DX`, etc.)
     - Multi-cinema search & select (badges with removal)
     - Date picker (limited to available sync dates)
     - CinéPass formula radio (`Gold`, `Silver`, `-26 ans`)
     - Supplement toggle checkbox
     - Language radio (`Toutes (VF & VOSTFR)`, `VOSTFR uniquement`, `VF uniquement`)
     - Format multiselect checkboxes (`Dolby Cinema`, `IMAX`, `4DX`, `ScreenX`, `Dolby Atmos`, `Onyx LED`, `3D`, `Standard`)
     - Target film count slider (1 to 5)
     - Earliest departure / Latest return time inputs
     - Meal break toggle (lunch & dinner) & minimum buffer minutes slider.
  3. `ItineraryCard`:
     - Summary header (Proposition #, total movie duration, total pause duration, score badge).
     - Timeline slots with start/end time, movie title, runtime tag, version tag (VF/VOST), and signature colored format badges (`✨ IMAX`, `🎬 Dolby Cinema`, `⚡ 4DX`, etc.).
     - Meal break slots (`🥗 Pause repas (12:25 ➔ 13:10) • 45 min de temps libre`) and cinema change warning (`🚶 Changement de cinéma: Pathé Alésia ➔ Pathé Parnasse`).
  4. `PreferencesController`: Reads and syncs state to/from `localStorage` and `window.location.search`.

### 5.3 Client-Side Scheduler Engine (TypeScript)
Located in `web/src/core/`:
- `scheduler.ts`: TypeScript translation of `Scheduler.generate_plans` using the exact same backtracking algorithm.
- `parser_utils.ts`: `is_valid_transition`, `covers_meal_break`, `compute_end_time`.
- `models.ts`: TypeScript interfaces for `Showtime`, `Itinerary`, `PlanCriteria`, `Cinema`.
- Unit tests run via `vitest` to verify complete behavioral parity with Python pytest suite.

### 5.4 GitHub Actions Workflow
Located in `.github/workflows/deploy.yml`:
- Trigger: `schedule: - cron: '0 4 * * 2'` (Every Tuesday at 04:00 UTC) + `workflow_dispatch` (manual trigger).
- Steps:
  1. `actions/checkout@v4`
  2. Setup Python + `astral-sh/setup-uv@v3`
  3. Run sync command to fetch all official Pathé & partner cinemas.
  4. Run `python scripts/export_static_data.py --output web/public/data`.
  5. Setup Node.js 20+ and install web dependencies (`npm ci`).
  6. Build Astro static site (`npm run build`).
  7. Deploy artifact to GitHub Pages via `actions/deploy-pages@v4`.

### 5.5 Streamlit Deprecation
- Remove `src/cinepass_planner/web/app.py` and `src/cinepass_planner/web/components.py`.
- Remove `streamlit` from `pyproject.toml` dependencies.
- Update `tests/test_web.py` to test the new exporter and static interfaces instead of Streamlit `AppTest`.

---

## 6. What's Left to the Builder

- Choosing between Astro with a lightweight client framework island (e.g. Svelte, Preact, or clean reactive TypeScript controller) to handle live reactive slider recalculations smoothly.
- Packaging the static JSON chunking strategy (single file vs per-city files depending on total payload size).
- Exact CSS animations and visual polish in Tailwind classes.

---

## 7. Reviewer Check

*(This document is dispatched to an autonomous reviewer subagent before plan approval).*
