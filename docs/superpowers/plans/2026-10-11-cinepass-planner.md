# CinéPass Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python application using `uv`, SQLite, and `allocine-seances` to plan cinema marathon days (1 to 5+ movies) with Pathé CinéPass (Gold, Silver, -26), featuring an interactive CLI (Typer/Rich) and a dark-themed Streamlit Web UI.

**Architecture:** A shared Python core engine with SQLite database (models, schema, repositories), an importer module (parsing the official PDF and querying Allociné via `allocineAPI`), a constraint-satisfaction backtracking scheduler, and two presentation layers (Typer/Rich CLI and Streamlit Web UI).

**Tech Stack:** Python 3.12+, `uv`, `allocine-seances` (`allocineAPI`), `sqlite3`, `pypdf`, `typer`, `rich`, `streamlit`, `pytest`.

**Spec:** `docs/superpowers/specs/2026-10-11-cinepass-planner-design.md`

## Global Constraints

- Python package managed via `uv`.
- Must use package `allocine-seances` importing `from allocineAPI.allocineAPI import allocineAPI`.
- Database must be SQLite with WAL mode (`PRAGMA journal_mode=WAL;`).
- All cinemas from the CinéPass PDF (`pathe_cinemas.pdf`) must be supported (Pathé circuit + independent partner cinemas).
- Planning calculations must read purely from local SQLite without triggering live HTTP calls during search.
- Zero overlapping movie showtimes allowed in generated itineraries.
- Respect the inter-movie transition buffer (default 15 minutes) and optional meal break (default 45-90 min).
- Support user CinéPass formula (Gold, Silver, -26) with explicit toggle for accepting or filtering out premium format extra fees.

## Review Focus

1. **Unknown duration format from Allociné:** When Allociné returns `runtime=None` or `runtime=0` or unexpected format (e.g. `"N/A"`), fallback gracefully to default 120 minutes without crashing.
2. **Missing showtimes for a date:** When a cinema has no showtimes published for the requested date, return a clear, user-friendly message proposing a synchronization or alternative date instead of an empty crash.
3. **Impossible constraints:** When no combination of $N$ movies can fit the requested window (e.g. 5 movies between 14:00 and 18:00), fallback to proposing the maximum possible movies (e.g. best 2-film combo) with an informative alert.
4. **Special format supplement filtering:** When pass is Silver / -26 and user unchecks "Accepter suppléments", verify IMAX/4DX/Dolby sessions are excluded from the output.
5. **Exact boundary conditions:** A movie starting at exactly `ends_at + buffer_minutes` must be accepted; a movie starting 1 minute before must be rejected.

---

### Task 1: Project Setup, Environment Scaffolding, and SQLite Database Layer

**Files:**
- Create: `pyproject.toml`
- Create: `src/cinepass_planner/__init__.py`
- Create: `src/cinepass_planner/config.py`
- Create: `src/cinepass_planner/models.py`
- Create: `src/cinepass_planner/db/__init__.py`
- Create: `src/cinepass_planner/db/connection.py`
- Create: `src/cinepass_planner/db/schema.py`
- Create: `src/cinepass_planner/db/repositories.py`
- Create: `tests/test_db.py`

**Interfaces:**
- Produces:
  - `models.PassType`: Enum (`GOLD`, `SILVER`, `UNDER26`, `OTHER`)
  - `models.Cinema`, `models.Movie`, `models.Showtime`, `models.Itinerary`: dataclasses
  - `db.connection.get_db_connection(db_path: Path | None = None) -> sqlite3.Connection`
  - `db.schema.init_db(conn: sqlite3.Connection) -> None`
  - `db.repositories.CinemaRepository`, `MovieRepository`, `ShowtimeRepository`

- [ ] **Step 1: Write the failing tests for database initialization and repository CRUD**

```python
# tests/test_db.py
import sqlite3
from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository, MovieRepository, ShowtimeRepository
from cinepass_planner.models import Cinema, Movie, Showtime, PassType

def test_init_db_creates_tables():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row[0] for row in cursor.fetchall()}
    assert {"cinemas", "movies", "showtimes", "sync_history"}.issubset(tables)

def test_cinema_repository_insert_and_get():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    repo = CinemaRepository(conn)
    cinema = Cinema(
        id="B0143",
        name="Pathé Thiais - Belle Epine",
        city="Thiais",
        address="Centre Commercial Belle Epine",
        group_type="Les Cinémas Pathé",
        accepts_gold=True,
        accepts_silver=True,
        accepts_under26=True
    )
    repo.save(cinema)
    saved = repo.get_by_id("B0143")
    assert saved is not None
    assert saved.name == "Pathé Thiais - Belle Epine"
    assert len(repo.list_all()) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_db.py -v`
Expected: FAIL with ModuleNotFoundError: No module named 'cinepass_planner'

- [ ] **Step 3: Implement `pyproject.toml`, package modules, DB connection, schema, and repositories**

Implement `pyproject.toml` with dependencies (`allocine-seances>=0.0.14`, `pypdf>=5.0.0`, `typer>=0.12.0`, `rich>=13.7.0`, `streamlit>=1.38.0`, `pytest>=8.0.0`), `config.py` setting default DB path to `data/cinepass.db`, dataclasses in `models.py`, schema creation with WAL mode in `schema.py`, and CRUD repositories in `repositories.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_db.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml src/cinepass_planner tests/test_db.py
git commit -m "feat: scaffold project and implement SQLite database layer"
```

---

### Task 2: Parsing Utils & Movie Duration Normalization

**Files:**
- Create: `src/cinepass_planner/core/parser_utils.py`
- Create: `tests/test_parser_utils.py`

**Interfaces:**
- Consumes: `models.Showtime`
- Produces:
  - `parse_runtime_to_minutes(runtime_str: str | None) -> int`: converts `"1h 52min"`, `"2h"`, `"45min"` to `112`, `120`, `45`, default `120` on invalid/missing.
  - `compute_end_time(start_iso: str, runtime_minutes: int) -> str`: adds runtime to ISO datetime.
  - `is_valid_transition(s1: Showtime, s2: Showtime, min_buffer_minutes: int) -> bool`: checks non-overlap and buffer.
  - `covers_meal_break(s1: Showtime, s2: Showtime, min_pause_minutes: int = 45) -> bool`: checks if gap between s1 and s2 overlaps lunch (12h-14h) or dinner (19h-21h) with at least `min_pause_minutes`.

- [ ] **Step 1: Write the failing tests for parsing utils**

```python
# tests/test_parser_utils.py
import pytest
from cinepass_planner.core.parser_utils import (
    parse_runtime_to_minutes,
    compute_end_time,
    is_valid_transition,
    covers_meal_break
)
from cinepass_planner.models import Showtime

def test_parse_runtime_various_formats():
    assert parse_runtime_to_minutes("1h 52min") == 112
    assert parse_runtime_to_minutes("2h 00min") == 120
    assert parse_runtime_to_minutes("2h") == 120
    assert parse_runtime_to_minutes("45min") == 45
    assert parse_runtime_to_minutes("3h 15min") == 195
    assert parse_runtime_to_minutes(None) == 120  # Fallback default
    assert parse_runtime_to_minutes("inconnu") == 120

def test_compute_end_time():
    assert compute_end_time("2026-10-18T10:15:00", 150) == "2026-10-18T12:45:00"
    assert compute_end_time("2026-10-18T14:00:00", 125) == "2026-10-18T16:05:00"

def test_is_valid_transition():
    s1 = Showtime(cinema_id="C1", movie_title="Film 1", starts_at="2026-10-18T10:00:00", ends_at="2026-10-18T12:00:00", date_str="2026-10-18")
    s2 = Showtime(cinema_id="C1", movie_title="Film 2", starts_at="2026-10-18T12:15:00", ends_at="2026-10-18T14:00:00", date_str="2026-10-18")
    s_too_early = Showtime(cinema_id="C1", movie_title="Film 3", starts_at="2026-10-18T12:10:00", ends_at="2026-10-18T14:00:00", date_str="2026-10-18")
    
    assert is_valid_transition(s1, s2, min_buffer_minutes=15) is True
    assert is_valid_transition(s1, s_too_early, min_buffer_minutes=15) is False

def test_covers_meal_break():
    s1 = Showtime(cinema_id="C1", movie_title="Matin", starts_at="2026-10-18T10:00:00", ends_at="2026-10-18T12:30:00", date_str="2026-10-18")
    s2 = Showtime(cinema_id="C1", movie_title="Apres-midi", starts_at="2026-10-18T13:45:00", ends_at="2026-10-18T15:30:00", date_str="2026-10-18")
    assert covers_meal_break(s1, s2, min_pause_minutes=60) is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_parser_utils.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `parser_utils.py`**

Implement regex parser for `"Xh Ymin"`, datetime calculations with `datetime` and `timedelta`, and window overlap logic for meals.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_parser_utils.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/core/parser_utils.py tests/test_parser_utils.py
git commit -m "feat: implement duration and time interval parsing utils"
```

---

### Task 3: PDF Network Extraction & Cinema Mapping

**Files:**
- Create: `src/cinepass_planner/importer/pdf_parser.py`
- Create: `data/cinemas_mapping.json`
- Create: `tests/test_pdf_parser.py`

**Interfaces:**
- Consumes: `pathe_cinemas.pdf`
- Produces:
  - `pdf_parser.extract_cinemas_from_pdf(pdf_path: Path) -> list[dict]`: parses all 3 pages, extracts group, city, site name, and accepted pass types.
  - `pdf_parser.load_or_build_cinema_registry(pdf_path: Path, mapping_path: Path) -> list[Cinema]`: reconciles PDF cinema list with Allociné IDs.

- [ ] **Step 1: Write the failing tests for PDF parser**

```python
# tests/test_pdf_parser.py
from pathlib import Path
from cinepass_planner.importer.pdf_parser import extract_cinemas_from_pdf, load_or_build_cinema_registry

def test_extract_cinemas_from_official_pdf():
    pdf_path = Path("pathe_cinemas.pdf")
    if not pdf_path.exists():
        pytest.skip("pathe_cinemas.pdf non présent localement")
    cinemas = extract_cinemas_from_pdf(pdf_path)
    assert len(cinemas) >= 100
    names = [c["name"] for c in cinemas]
    assert any("Alésia" in name for name in names)
    assert any("Belle Epine" in name for name in names)

def test_cinema_registry_has_allocine_ids():
    pdf_path = Path("pathe_cinemas.pdf")
    mapping_path = Path("data/cinemas_mapping.json")
    registry = load_or_build_cinema_registry(pdf_path, mapping_path)
    assert len(registry) > 0
    # Every cinema must have a valid non-empty Allociné ID
    for c in registry:
        assert c.id is not None and len(c.id) >= 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_pdf_parser.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `pdf_parser.py` and generate `data/cinemas_mapping.json`**

Parse the table lines from the PDF using `pypdf`. Map the Pathé circuit cinemas (`circuit-81002`) and the independent partner cinemas (like Max Linder, 7 Parnassiens, Cinéma du Panthéon) into `data/cinemas_mapping.json` with their Allocine IDs. Provide a seed function populating `CinemaRepository`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_pdf_parser.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/importer/pdf_parser.py data/cinemas_mapping.json tests/test_pdf_parser.py
git commit -m "feat: parse CinéPass network PDF and build cinema registry"
```

---

### Task 4: Allociné Client & Sync Service

**Files:**
- Create: `src/cinepass_planner/importer/allocine_client.py`
- Create: `src/cinepass_planner/importer/sync_service.py`
- Create: `tests/test_sync_service.py`

**Interfaces:**
- Consumes: `allocineAPI`, `CinemaRepository`, `MovieRepository`, `ShowtimeRepository`
- Produces:
  - `AllocineClient.get_daily_showtimes(cinema_id: str, date_str: str) -> list[tuple[Movie, list[Showtime]]]`: safely calls Allociné, normalizes runtime, formats, and showtimes.
  - `SyncService.sync_cinema(cinema_id: str, start_date: date, days_count: int = 7) -> int`: downloads and saves 7 days into SQLite.
  - `SyncService.is_cinema_fresh(cinema_id: str, for_date: date) -> bool`: checks if database already holds up-to-date data for that date.

- [ ] **Step 1: Write the failing tests for sync service (with mock)**

```python
# tests/test_sync_service.py
import sqlite3
from datetime import date
from unittest.mock import MagicMock
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository, MovieRepository, ShowtimeRepository
from cinepass_planner.importer.sync_service import SyncService
from cinepass_planner.models import Cinema, Movie, Showtime

def test_sync_service_inserts_movies_and_showtimes():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    cin_repo = CinemaRepository(conn)
    mov_repo = MovieRepository(conn)
    sht_repo = ShowtimeRepository(conn)
    
    cin_repo.save(Cinema("B0143", "Pathé Belle Epine", "Thiais", "", "Pathé", True, True, True))
    
    mock_client = MagicMock()
    mock_movie = Movie(id="M1", title="Dune 2", original_title="Dune 2", runtime_minutes=150)
    mock_showtime = Showtime(
        cinema_id="B0143",
        movie_title="Dune 2",
        starts_at="2026-10-18T10:15:00",
        ends_at="2026-10-18T12:45:00",
        date_str="2026-10-18",
        version="ORIGINAL",
        format="Dolby Cinema"
    )
    mock_client.get_daily_showtimes.return_value = [(mock_movie, [mock_showtime])]
    
    service = SyncService(conn, client=mock_client)
    count = service.sync_cinema("B0143", start_date=date(2026, 10, 18), days_count=1)
    
    assert count == 1
    assert mov_repo.get_by_title("Dune 2") is not None
    saved_st = sht_repo.get_showtimes("B0143", "2026-10-18")
    assert len(saved_st) == 1
    assert saved_st[0].format == "Dolby Cinema"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_sync_service.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `allocine_client.py` and `sync_service.py`**

Implement `AllocineClient` integrating `allocineAPI`, extracting runtime via `get_movies` and matching with `get_showtime`, formatting ends_at with `compute_end_time`. Implement `SyncService` storing showtimes and updating `sync_history`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_sync_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/importer/allocine_client.py src/cinepass_planner/importer/sync_service.py tests/test_sync_service.py
git commit -m "feat: implement Allociné scraper client and SQLite sync service"
```

---

### Task 5: Core Scheduling Engine (Backtracking with Constraints)

**Files:**
- Create: `src/cinepass_planner/core/scheduler.py`
- Create: `tests/test_scheduler.py`

**Interfaces:**
- Consumes: `models.Showtime`, `models.Itinerary`, `models.PassType`, `core.parser_utils`
- Produces:
  - `Scheduler.plan_day(criteria: PlanCriteria) -> list[Itinerary]`: computes up to 3 optimal non-overlapping movie day plans.
  - `PlanCriteria`: dataclass with fields `cinema_id`, `date_str`, `target_films_count` (int, 1-5+), `start_time` (str, "10:00"), `max_end_time` (str, "23:00"), `priority_movies` (list[str]), `pass_type` (`PassType`), `allow_supplements` (bool), `min_buffer_minutes` (int, default 15), `require_meal_break` (bool, default True).

- [ ] **Step 1: Write the failing tests for scheduler**

```python
# tests/test_scheduler.py
import pytest
from cinepass_planner.core.scheduler import Scheduler, PlanCriteria
from cinepass_planner.models import Showtime, PassType

@pytest.fixture
def sample_showtimes():
    # Film A (Standard, 2h)
    s_a1 = Showtime(cinema_id="C1", movie_title="Film A", starts_at="2026-10-18T10:00:00", ends_at="2026-10-18T12:00:00", date_str="2026-10-18", format="Standard")
    # Film B (IMAX, 2h)
    s_b1 = Showtime(cinema_id="C1", movie_title="Film B", starts_at="2026-10-18T12:15:00", ends_at="2026-10-18T14:15:00", date_str="2026-10-18", format="IMAX")
    # Film B alternative afternoon
    s_b2 = Showtime(cinema_id="C1", movie_title="Film B", starts_at="2026-10-18T14:00:00", ends_at="2026-10-18T16:00:00", date_str="2026-10-18", format="IMAX")
    # Film C (Standard, 2h)
    s_c1 = Showtime(cinema_id="C1", movie_title="Film C", starts_at="2026-10-18T16:30:00", ends_at="2026-10-18T18:30:00", date_str="2026-10-18", format="Standard")
    return [s_a1, s_b1, s_b2, s_c1]

def test_scheduler_generates_valid_sequence(sample_showtimes):
    scheduler = Scheduler()
    criteria = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=3,
        start_time="09:00",
        max_end_time="20:00",
        priority_movies=["Film B"],
        pass_type=PassType.GOLD,
        allow_supplements=True,
        min_buffer_minutes=15,
        require_meal_break=False
    )
    results = scheduler.generate_plans(sample_showtimes, criteria)
    assert len(results) >= 1
    best = results[0]
    assert len(best.showtimes) == 3
    titles = [s.movie_title for s in best.showtimes]
    assert titles == ["Film A", "Film B", "Film C"]
    assert "Film B" in titles

def test_scheduler_filters_out_supplements_when_disallowed(sample_showtimes):
    scheduler = Scheduler()
    # Pass Silver, supplements refused -> IMAX should be filtered out
    criteria = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=2,
        start_time="09:00",
        max_end_time="20:00",
        priority_movies=[],
        pass_type=PassType.SILVER,
        allow_supplements=False,
        min_buffer_minutes=15,
        require_meal_break=False
    )
    results = scheduler.generate_plans(sample_showtimes, criteria)
    assert len(results) >= 1
    for plan in results:
        for st in plan.showtimes:
            assert st.format != "IMAX"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `scheduler.py`**

Implement recursive backtracking with DFS exploration:
1. Filter showtimes by time window and supplement rules.
2. Group showtimes by movie title.
3. Explore candidate paths: add next non-overlapping showtime satisfying `min_buffer_minutes`.
4. Check meal break satisfaction if `require_meal_break=True`.
5. Score itineraries (+1000 per priority movie, penalty for excessive idle time, reward for smooth 15-30m transitions).
6. Return sorted top 3 distinct itineraries.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_scheduler.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/core/scheduler.py tests/test_scheduler.py
git commit -m "feat: implement constraint-satisfaction backtracking scheduler"
```

---

### Task 6: Interactive CLI (Typer + Rich)

**Files:**
- Create: `src/cinepass_planner/cli/__init__.py`
- Create: `src/cinepass_planner/cli/main.py`
- Modify: `pyproject.toml` (add `[project.scripts] cinepass = "cinepass_planner.cli.main:app"`)
- Create: `tests/test_cli.py`

**Interfaces:**
- Consumes: `db`, `importer`, `core.scheduler`
- Produces: CLI commands `cinepass plan`, `cinepass sync`, `cinepass cinemas`, `cinepass movies`

- [ ] **Step 1: Write the failing tests for CLI**

```python
# tests/test_cli.py
from typer.testing import CliRunner
from cinepass_planner.cli.main import app

runner = CliRunner()

def test_cli_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "CinéPass" in result.stdout

def test_cli_cinemas_command():
    result = runner.invoke(app, ["cinemas"])
    assert result.exit_code == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_cli.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `cli/main.py` with Typer and Rich**

Implement:
- `cinepass cinemas [--city <city>]`: shows Rich Table with Cinema ID, Name, City, Gold, Silver.
- `cinepass sync [--cinema <id_or_name>] [--days <N>]`: triggers `SyncService` with Rich Progress bar.
- `cinepass plan`: prompts for cinema, date, target count, start/end hours, pass type, supplements allowed, and displays generated itineraries as colorful timeline tables with movie duration, room, transition times, and meal breaks.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_cli.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/cli/main.py pyproject.toml tests/test_cli.py
git commit -m "feat: implement Typer and Rich CLI interface"
```

---

### Task 7: Streamlit Web UI (Dark Cinema Theme)

**Files:**
- Create: `src/cinepass_planner/web/__init__.py`
- Create: `src/cinepass_planner/web/app.py`
- Create: `src/cinepass_planner/web/components.py`
- Create: `tests/test_web.py`

**Interfaces:**
- Consumes: `db.connection`, `db.repositories`, `importer.sync_service`, `core.scheduler`
- Produces: Web application entrypoint run via `uv run streamlit run src/cinepass_planner/web/app.py`

- [ ] **Step 1: Write test for web data loading and component rendering**

```python
# tests/test_web.py
import sqlite3
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository
from cinepass_planner.models import Cinema
from cinepass_planner.web.components import format_itinerary_html
from cinepass_planner.models import Itinerary, Showtime

def test_format_itinerary_html_renders_cards():
    itinerary = Itinerary(
        showtimes=[
            Showtime("C1", "Dune 2", "2026-10-18T10:15:00", "2026-10-18T12:45:00", "2026-10-18", "ORIGINAL", "Dolby Cinema")
        ],
        total_movie_minutes=150,
        total_pause_minutes=0,
        score=100
    )
    html = format_itinerary_html(itinerary, plan_index=1)
    assert "Dune 2" in html
    assert "10:15" in html
    assert "Dolby Cinema" in html
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_web.py -v`
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Implement `components.py` and `app.py`**

Implement:
- Cinema dark theme CSS (`#0d1117`, `#161b22`, `#f5c518`).
- Header with sync status and on-demand sync button.
- Form controls: Cinema selectbox, Date picker, Pass formula radio (`Gold`, `Silver`, `-26`), "Accepter suppléments" checkbox, Segmented/slider for target films (1 to 5+), Start/End time inputs, Priority movies multiselect, Meal break checkbox.
- Multi-plan comparison tabs / cards.
- Detailed timeline cards with movie badges, lunch pause slots, transition slots, and agenda summary.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_web.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cinepass_planner/web/ tests/test_web.py
git commit -m "feat: implement Streamlit Web UI with cinema dark theme"
```

---

### Task 8: Seed Database, End-to-End Verification, and Documentation

**Files:**
- Create: `scripts/seed_database.py`
- Modify: `README.md`

- [ ] **Step 1: Write seed script populating all cinemas from `pathe_cinemas.pdf` and `cinemas_mapping.json` into `data/cinepass.db`**
- [ ] **Step 2: Run seed script and verify database contents**

Run: `uv run python scripts/seed_database.py`
Expected: Output showing 100+ cinemas loaded into `data/cinepass.db`.

- [ ] **Step 3: Run full pytest test suite across all tasks**

Run: `uv run pytest -v`
Expected: All tests PASS with 100% success rate.

- [ ] **Step 4: Verify CLI output on sample planning**

Run: `uv run cinepass cinemas` and `uv run cinepass plan --help`
Expected: Rich tables printed with zero errors.

- [ ] **Step 5: Write comprehensive `README.md` with installation and quickstart guide**
- [ ] **Step 6: Commit and finalize**

```bash
git add scripts/seed_database.py README.md
git commit -m "docs: finalize setup, seed script, and user documentation"
```
