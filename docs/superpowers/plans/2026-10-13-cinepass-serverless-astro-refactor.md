# Cinepass Planner Serverless Astro.js Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor CinéPass Planner from a local Streamlit application into a static, serverless Astro.js + Tailwind CSS website deployed on GitHub Pages with client-side TypeScript scheduling and automated weekly data sync via GitHub Actions.

**Architecture:** Pure static website with client-side backtracking scheduling running in TypeScript (< 50ms) using pre-generated static JSON files (`cinemas.json`, `dates.json`, `showtimes-<date>.json`). Python CLI and Allociné client are retained for weekly batch data ingestion and static JSON exporting. Streamlit is retired and deleted.

**Tech Stack:** Astro.js, Tailwind CSS, TypeScript, Vitest, Python 3.12, Typer, SQLite, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-13-cinepass-serverless-astro-refactor-design.md`

## Global Constraints

- **NO Git Commits:** Do not run `git commit` commands during execution (user constraint). Changes remain uncommitted locally.
- **Retire Streamlit:** Completely remove `src/cinepass_planner/web/` and remove `streamlit` from `pyproject.toml`.
- **Zero Server Costs:** The web application must be 100% static client-side; no server-side Node.js or Python runtime required at runtime.
- **Scheduling Parity:** The TypeScript scheduler in `web/src/core/scheduler.ts` must exactly reproduce the backtracking logic, scoring heuristics, meal windows (12h-14h, 19h-21h), pause penalties, and pass supplement rules of `src/cinepass_planner/core/scheduler.py`.
- **UI Theme Parity:** Preserve Dark Cinema palette (`#0d1117` base, `#161b22` cards, `#f5c518` gold accent), technology badges (✨ IMAX, 🎬 Dolby Cinema, ⚡ 4DX, 📐 ScreenX, 🔊 Dolby Atmos, 📺 Onyx, 👓 3D, Standard), and filters (City, Cinema multi-select, Pass type, Supplements, Languages, Formats, Priority films).
- **Data Freshness Schedule:** Tuesday 04:00 UTC weekly GitHub Actions cron reflecting the French cinema week.

## Review Focus

1. **Empty / Expired date selection:** User selects a date for which no `showtimes-<date>.json` exists or all showtimes are in the past -> The UI must display a clear, friendly warning banner inviting the user to pick an upcoming date rather than breaking or looping.
2. **Empty cinema selection:** User deselects all cinemas in the multi-select -> The UI must immediately show a helpful guidance state prompting to select at least one cinema without triggering scheduler calculation.
3. **No viable marathon found:** Strict filter combinations (e.g. 5 films, no supplements, mandatory meal break in narrow 3-hour window) yield 0 paths -> The UI must show an actionable fallback notice suggesting widening time boundaries or unchecking constraints (mirroring Streamlit behavior).
4. **Format badge fallback:** Showtime has an unfamiliar or combined format string -> Badge generator must gracefully render with a default ticket icon and appropriate styling without throwing.
5. **Static JSON path resolution on GitHub Pages:** Asset and JSON fetch paths must work whether hosted on root domain (`/`) or repository subpath (`/<repo>/`) -> Build and fetch routines must use Astro's `import.meta.env.BASE_URL`.

---

### Task 1: Python Static Data Exporter & Streamlit Retirement

**Files:**
- Create: `scripts/export_static_data.py`
- Modify: `pyproject.toml`
- Create: `tests/test_exporter.py`
- Modify: `tests/test_web.py` (replace Streamlit AppTest with static compatibility checks or remove obsolete tests)
- Delete: `src/cinepass_planner/web/app.py`, `src/cinepass_planner/web/components.py`

**Interfaces:**
- Consumes: `cinepass_planner.db.connection.get_db_connection`, `cinepass_planner.db.repositories.CinemaRepository`, `cinepass_planner.db.repositories.ShowtimeRepository`
- Produces: CLI script `scripts/export_static_data.py --output <dir>` outputting `cinemas.json`, `dates.json`, `showtimes-<date>.json` with compact payload structure.

- [ ] **Step 1: Write test for static data export**

In `tests/test_exporter.py`:
```python
import json
from pathlib import Path
from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository, ShowtimeRepository
from cinepass_planner.models import Cinema, Showtime

def test_export_static_data_generates_json_files(tmp_path):
    from scripts.export_static_data import export_static_data
    
    conn = get_db_connection(tmp_path / "test.db")
    init_db(conn)
    cin_repo = CinemaRepository(conn)
    sht_repo = ShowtimeRepository(conn)
    
    cin = Cinema("C1", "Pathé Test", "Paris")
    cin_repo.save(cin)
    st = Showtime("C1", "Film A", "2026-10-18T10:00:00", "2026-10-18T12:00:00", "2026-10-18", "VOST", "IMAX")
    sht_repo.save(st)
    
    out_dir = tmp_path / "static_data"
    export_static_data(conn, out_dir)
    
    assert (out_dir / "cinemas.json").exists()
    assert (out_dir / "dates.json").exists()
    assert (out_dir / "showtimes-2026-10-18.json").exists()
    
    cinemas_data = json.loads((out_dir / "cinemas.json").read_text(encoding="utf-8"))
    assert len(cinemas_data) == 1
    assert cinemas_data[0]["id"] == "C1"
    assert "IMAX" in cinemas_data[0]["formats"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_exporter.py -v`
Expected: FAIL (ModuleNotFoundError: No module named 'scripts.export_static_data')

- [ ] **Step 3: Implement `scripts/export_static_data.py`**

Create `scripts/export_static_data.py`:
- Parses `--output` argument (default: `web/public/data`).
- Queries all cinemas from `CinemaRepository` and aggregates unique formats available per cinema from `showtimes`.
- Writes `cinemas.json` (`[{ id, name, city, formats, accepts_gold, accepts_silver, accepts_under26 }]`).
- Queries distinct `date_str` from `showtimes` ordered ascending and writes `dates.json` (`["YYYY-MM-DD", ...]`).
- For each date, groups showtimes by `cinema_id` into compact objects (`{ starts_at, ends_at, title, version, format }`) and writes `showtimes-<date>.json`.
- Adds CLI entrypoint `if __name__ == "__main__": ...` using `argparse`.

- [ ] **Step 4: Remove Streamlit dependency & clean obsolete web files**

1. Remove `streamlit` from `pyproject.toml` dependencies.
2. Delete `src/cinepass_planner/web/app.py` and `src/cinepass_planner/web/components.py`.
3. Update `tests/test_web.py` to remove `AppTest` (which depended on Streamlit) and keep HTML formatting tests or move them to `test_exporter.py`.

- [ ] **Step 5: Run tests to verify exporter passes and test suite is green**

Run: `uv run pytest tests/test_exporter.py tests/ -v`
Expected: All tests PASS.

---

### Task 2: Astro.js + Tailwind Project Setup in `web/`

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tailwind.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/src/styles/global.css`

**Interfaces:**
- Consumes: Node.js npm tooling
- Produces: Runnable Astro.js environment with Tailwind CSS and Vitest test runner ready for components and core algorithms.

- [ ] **Step 1: Create `web/package.json`**

Configure scripts (`dev`, `build`, `preview`, `test`) and dependencies:
- `astro`: `^4.16.0` (or `^5.0.0`)
- `@astrojs/tailwind`: `^5.1.0`
- `tailwindcss`: `^3.4.0`
- `vitest`: `^2.1.0`
- `typescript`: `^5.5.0`

- [ ] **Step 2: Install dependencies in `web/`**

Run:
```powershell
cd web; npm install; cd ..
```
Verify `node_modules` exists in `web/`.

- [ ] **Step 3: Configure `astro.config.mjs`, `tailwind.config.mjs`, and `tsconfig.json`**

In `web/astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  base: process.env.BASE_PATH || '/',
});
```

In `web/tailwind.config.mjs`:
Configure dark cinema theme palette:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#0d1117',
          card: '#161b22',
          slot: '#1c2128',
          border: '#30363d',
          accent: '#f5c518',
          text: '#e6edf3',
          muted: '#8b949e',
        }
      }
    },
  },
  plugins: [],
};
```

In `web/src/styles/global.css`:
Include Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) and dark background defaults.

- [ ] **Step 4: Verify Vitest test runner runs in `web/`**

Run: `npm --prefix web run test -- --run`
Expected: 0 tests run (or no test files found, exit code 0).

---

### Task 3: Client-side TypeScript Models & Parser Utilities

**Files:**
- Create: `web/src/core/models.ts`
- Create: `web/src/core/parser_utils.ts`
- Create: `web/tests/parser_utils.test.ts`

**Interfaces:**
- Consumes: Static JSON payloads
- Produces: Strongly typed data structures (`Showtime`, `Itinerary`, `PlanCriteria`, `Cinema`, `PassType`) and time validation utilities (`computeEndTime`, `isValidTransition`, `coversMealBreak`, `determineShowtimeFormat`).

- [ ] **Step 1: Write Vitest unit tests in `web/tests/parser_utils.test.ts`**

Port Python test cases from `tests/test_parser_utils.py`:
- `parseRuntimeToMinutes`: handles `"1h 52min"`, `"2h"`, `"45min"`, null/0 fallback to 120.
- `computeEndTime`: correctly adds minutes to ISO datetime strings.
- `isValidTransition`: checks `min_buffer_minutes` between `s1.ends_at` and `s2.starts_at`.
- `coversMealBreak`: checks 12:00-14:00 (lunch) and 19:00-21:00 (dinner) windows with minimum pause.

- [ ] **Step 2: Run Vitest to verify tests fail**

Run: `npm --prefix web run test -- --run`
Expected: FAIL (Cannot find module `../src/core/parser_utils`).

- [ ] **Step 3: Implement `web/src/core/models.ts` and `web/src/core/parser_utils.ts`**

Implement:
- `PassType` enum: `GOLD = "Gold"`, `SILVER = "Silver"`, `UNDER26 = "-26 ans"`.
- `Showtime`, `Itinerary`, `PlanCriteria`, `Cinema` interfaces.
- `parseRuntimeToMinutes(runtime: string | number | null | undefined): number`.
- `computeEndTime(startsAt: string, runtimeMinutes: number): string`.
- `isValidTransition(s1: Showtime, s2: Showtime, minBufferMinutes: number): boolean`.
- `coversMealBreak(s1: Showtime, s2: Showtime, minPauseMinutes?: number): boolean`.

- [ ] **Step 4: Run Vitest to verify tests pass**

Run: `npm --prefix web run test -- --run`
Expected: PASS with 100% assertions satisfied.

---

### Task 4: Client-side TypeScript Backtracking Scheduler

**Files:**
- Create: `web/src/core/scheduler.ts`
- Create: `web/tests/scheduler.test.ts`

**Interfaces:**
- Consumes: `web/src/core/models.ts`, `web/src/core/parser_utils.ts`
- Produces: `class Scheduler` with `generatePlans(showtimes: Showtime[], criteria: PlanCriteria): Itinerary[]`

- [ ] **Step 1: Write Vitest unit tests in `web/tests/scheduler.test.ts`**

Port all Python test cases from `tests/test_scheduler.py`:
- `test_scheduler_generates_valid_sequence`: target 3 films, priority film included, no duplicate titles.
- `test_scheduler_filters_out_supplements_when_disallowed`: Silver pass without supplements excludes IMAX/Dolby/4DX.
- `test_scheduler_respects_meal_break`: requires gap covering lunch/dinner window.
- `test_scheduler_filters_by_language`: filters `VOST` vs `VF`.
- `test_scheduler_filters_by_selected_formats`: filters allowed formats (e.g. only `Dolby Cinema`).
- `test_scheduler_impossible_window_falls_back`: returns fallback max length sequence when target count cannot be satisfied.

- [ ] **Step 2: Run Vitest to verify tests fail**

Run: `npm --prefix web run test -- --run`
Expected: FAIL (Cannot find module `../src/core/scheduler`).

- [ ] **Step 3: Implement `web/src/core/scheduler.ts`**

Implement `Scheduler`:
1. Filter showtime candidates by:
   - Window boundaries: `starts_at >= start_time` and `ends_at <= max_end_time`.
   - Pass type and supplement rules: `is_premium_format && criteria.pass_type != GOLD && !criteria.allow_supplements` -> excluded.
   - Language: `criteria.language != "ALL"` -> check `s.version == criteria.language`.
   - Formats: if `criteria.selected_formats.length > 0` -> check `s.format in criteria.selected_formats`.
2. Backtracking path search `_findPaths`:
   - Builds paths of target length where `isValidTransition(prev, next, minBuffer)` holds and no duplicate movie titles.
   - If no full paths found, automatically falls back to paths of `target_films_count - 1` (down to 1).
3. Scoring and sorting:
   - Base score: `+1000 * count`.
   - Priority bonus: `+2000` per matched priority title.
   - Meal break bonus: `+500` if meal window covered.
   - Downtime penalty: `-1.5 * pause_min`, plus `-3 * (pause_min - 60)` for excess pauses.
   - Cinema switch penalty: `-100` per cinema change.
4. Deduplicate signatures and return top 3 itineraries.

- [ ] **Step 4: Run Vitest to verify tests pass**

Run: `npm --prefix web run test -- --run`
Expected: All scheduler tests PASS.

---

### Task 5: Web UI Components, Styling & Interactive Controller

**Files:**
- Create: `web/src/components/Header.astro`
- Create: `web/src/components/Badge.astro`
- Create: `web/src/components/ItineraryCard.ts` (or client component rendering HTML/DOM)
- Create: `web/src/components/PlannerApp.astro` (or `web/src/pages/index.astro`)
- Create: `web/src/core/storage.ts` (localStorage preferences load/save & URL params)

**Interfaces:**
- Consumes: `web/src/core/scheduler.ts`, static JSONs in `web/public/data/`
- Produces: Fully interactive web app matching Streamlit UI with sidebar filters, multi-cinema selector, priority film picker, and dynamic itinerary cards.

- [ ] **Step 1: Implement format badge styling helper**

Create format badge renderer matching colors from Streamlit CSS:
- IMAX: Cyan border & glow (`#00e5ff`)
- Dolby Cinema: Purple border & glow (`#e040fb`)
- 4DX: Amber/Orange (`#ff9100`)
- ScreenX: Sky blue (`#38bdf8`)
- Dolby Atmos: Blue (`#60a5fa`)
- Onyx LED: Yellow (`#fbbf24`)
- 3D: Green (`#4ade80`)
- Standard: Muted gray (`#8b949e`)
- Gold badge indicator: `(Inclus Gold)` or `(+Supplément)`.

- [ ] **Step 2: Implement Filter Sidebar & Interactive Controller**

Build interactive sidebar controller:
- Loads `cinemas.json` and `dates.json` on page load.
- City dropdown filter (`"Toutes"` + unique cities sorted).
- Multi-cinema selector with search/check behavior.
- Date dropdown (from `dates.json`).
- Pass formula radio: Gold / Silver / -26 ans.
- Supplements checkbox: "Accepter séances à supplément".
- Language radio: Toutes / VOSTFR / VF.
- Formats multi-select / checkboxes: IMAX, Dolby Cinema, 4DX, ScreenX, Dolby Atmos, Onyx LED, 3D, Standard.
- Target film count slider (1 to 5).
- Time bounds: Start ("10:00") and Max End ("23:00").
- Options: Pause repas checkbox, Marge minimale (15 min).
- Priority films multiselect (populated dynamically from unique titles of loaded date showtimes).
- Saves/restores settings to `localStorage` and URL search parameters.

- [ ] **Step 3: Implement Itinerary propositions rendering**

Build itinerary card list:
- Header: Proposition number, marathon film count, total movie runtime, total pause time, gold star score badge.
- Timeline items: Start/End time, movie title, language badge, format badge with supplement indicator.
- Gap intervals: Transition notice with buffer margin or green/amber 🥗 Pause repas badge (showing lunch/dinner window and free time duration) + 🚶 Changement de cinéma notice when cinemas differ.
- Warning state when 0 itineraries match constraints with helpful tips to relax filters.

- [ ] **Step 4: Verify local Astro build**

Export sample static data from local DB:
```powershell
uv run python scripts/export_static_data.py --output web/public/data
```
Build Astro:
```powershell
npm --prefix web run build
```
Verify `web/dist/index.html` and `web/dist/data/` exist.

---

### Task 6: GitHub Actions Workflow for Weekly Automation

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Python sync script, `export_static_data.py`, Astro build
- Produces: Automated deployment to GitHub Pages every Tuesday morning.

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

Write workflow:
- Triggers:
  - `schedule`: `cron: '0 4 * * 2'` (Tuesday 04:00 UTC)
  - `workflow_dispatch`: manual execution button
- Permissions: `pages: write`, `id-token: write`, `contents: read`
- Steps:
  1. `actions/checkout@v4`
  2. Setup Python 3.12 + `astral-sh/setup-uv@v3`
  3. Initialize database: `uv run python scripts/seed_database.py`
  4. Synchronize network showtimes: `uv run python -m cinepass_planner.cli.main sync-all --days 8` (or iterate mapped cinemas)
  5. Export static data: `uv run python scripts/export_static_data.py --output web/public/data`
  6. Setup Node.js 20+ with cache: `actions/setup-node@v4`
  7. Install web dependencies: `npm --prefix web ci`
  8. Build Astro site: `npm --prefix web run build` (with `BASE_PATH: '/${{ github.event.repository.name }}/'`)
  9. Deploy to GitHub Pages: `actions/upload-pages-artifact@v3` (path: `web/dist`) and `actions/deploy-pages@v4`.

- [ ] **Step 2: Add `sync-all` CLI command in `src/cinepass_planner/cli/main.py`**

In `src/cinepass_planner/cli/main.py`:
- Add `@app.command(name="sync-all")` to sync all cinemas in the registry over N days with progress tracking and error resilience (individual cinema failure does not crash the entire sync).

---

### Task 7: Full Verification & Parity Testing

**Files:**
- Existing test suite + new tests

**Interfaces:**
- Comprehensive end-to-end verification

- [ ] **Step 1: Run Python test suite**

Run: `uv run pytest -v`
Expected: All Python tests PASS (database, scheduler, sync service, parser utils, static exporter).

- [ ] **Step 2: Run TypeScript test suite**

Run: `npm --prefix web run test -- --run`
Expected: All Vitest tests PASS (parser utils, scheduler parity).

- [ ] **Step 3: Run full static export & Astro production build**

Run:
```powershell
uv run python scripts/export_static_data.py --output web/public/data
npm --prefix web run build
```
Expected: Build succeeds with 0 errors, generating static site in `web/dist/`.

- [ ] **Step 4: Verify Streamlit absence**

Verify `src/cinepass_planner/web/` no longer exists and `streamlit` is not imported anywhere in the project.
