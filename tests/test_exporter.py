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

    dates_data = json.loads((out_dir / "dates.json").read_text(encoding="utf-8"))
    assert dates_data == ["2026-10-18"]

    showtimes_data = json.loads((out_dir / "showtimes-2026-10-18.json").read_text(encoding="utf-8"))
    assert "C1" in showtimes_data
    assert len(showtimes_data["C1"]) == 1
    assert showtimes_data["C1"][0]["title"] == "Film A"
    assert showtimes_data["C1"][0]["format"] == "IMAX"


def test_export_static_data_legacy_db_without_ratings_column(tmp_path):
    """Verify that export_static_data does not crash on a legacy DB without ratings columns."""
    from scripts.export_static_data import export_static_data
    import sqlite3

    db_path = tmp_path / "legacy.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    with conn:
        conn.executescript("""
            CREATE TABLE cinemas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT,
                address TEXT,
                group_type TEXT DEFAULT 'Les Cinémas Pathé',
                accepts_gold BOOLEAN DEFAULT 1,
                accepts_silver BOOLEAN DEFAULT 1,
                accepts_under26 BOOLEAN DEFAULT 1,
                is_pathe_network BOOLEAN DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE movies (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                runtime_minutes INTEGER NOT NULL
            );
            CREATE TABLE showtimes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cinema_id TEXT NOT NULL,
                movie_title TEXT NOT NULL,
                starts_at TEXT NOT NULL,
                ends_at TEXT NOT NULL,
                date_str TEXT NOT NULL,
                version TEXT,
                format TEXT,
                screen_name TEXT
            );
            INSERT INTO cinemas (id, name, city) VALUES ('C1', 'Pathé Test', 'Paris');
            INSERT INTO movies (id, title, runtime_minutes) VALUES ('M1', 'Legacy Movie', 120);
        """)

    out_dir = tmp_path / "legacy_out"
    # Should not throw sqlite3.OperationalError: no such column: user_rating
    stats = export_static_data(conn, out_dir)
    assert stats["cinemas_count"] == 1
    assert (out_dir / "ratings.json").exists()


def test_export_static_data_deduplicates_showtimes_and_handles_duplicate_movies(tmp_path):
    """Verify that duplicate rows in movies or showtimes do NOT duplicate output in static JSON."""
    from scripts.export_static_data import export_static_data
    from cinepass_planner.models import Movie

    conn = get_db_connection(tmp_path / "test_dedup.db")
    init_db(conn)
    cin_repo = CinemaRepository(conn)
    sht_repo = ShowtimeRepository(conn)

    cin = Cinema("C1", "Pathé Test", "Paris")
    cin_repo.save(cin)

    # Simulate legacy DB with duplicate movies by temporarily dropping unique index
    with conn:
        conn.execute("DROP INDEX IF EXISTS idx_movies_unique_title")
        conn.execute("INSERT INTO movies (id, title, runtime_minutes, poster_url) VALUES ('M1', 'Dune', 160, 'poster1.jpg')")
        conn.execute("INSERT INTO movies (id, title, runtime_minutes, poster_url) VALUES ('M2', 'Dune', 160, 'poster2.jpg')")

    # Insert a single showtime
    st1 = Showtime("C1", "Dune", "2026-10-18T14:00:00", "2026-10-18T16:40:00", "2026-10-18", "VOST", "IMAX")
    sht_repo.save(st1)

    # Insert duplicate showtime
    st2 = Showtime("C1", "Dune", "2026-10-18T14:00:00", "2026-10-18T16:40:00", "2026-10-18", "VOST", "IMAX")
    sht_repo.save(st2)

    out_dir = tmp_path / "static_data"
    export_static_data(conn, out_dir)

    showtimes_data = json.loads((out_dir / "showtimes-2026-10-18.json").read_text(encoding="utf-8"))
    assert len(showtimes_data["C1"]) == 1, f"Expected 1 showtime but got {len(showtimes_data['C1'])}"
    assert showtimes_data["C1"][0]["title"] == "Dune"
    assert showtimes_data["C1"][0]["starts_at"] == "2026-10-18T14:00:00"


