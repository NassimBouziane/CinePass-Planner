import sqlite3
import pytest
from pathlib import Path
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

def test_movie_and_showtime_repositories():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    mov_repo = MovieRepository(conn)
    sht_repo = ShowtimeRepository(conn)

    movie = Movie(
        id="M1",
        title="Dune 2",
        original_title="Dune: Part Two",
        runtime_minutes=166,
        genres=["Science-Fiction", "Aventure"],
        director="Denis Villeneuve"
    )
    mov_repo.save(movie)
    saved_m = mov_repo.get_by_title("Dune 2")
    assert saved_m is not None
    assert saved_m.runtime_minutes == 166

    showtime = Showtime(
        cinema_id="B0143",
        movie_title="Dune 2",
        starts_at="2026-10-18T10:15:00",
        ends_at="2026-10-18T13:01:00",
        date_str="2026-10-18",
        version="ORIGINAL",
        format="Dolby Cinema"
    )
    sht_repo.save(showtime)
    saved_st = sht_repo.get_showtimes("B0143", "2026-10-18")
    assert len(saved_st) == 1
    assert saved_st[0].format == "Dolby Cinema"

def test_showtime_repository_get_showtimes_multiple_cinemas():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    cin_repo = CinemaRepository(conn)
    sht_repo = ShowtimeRepository(conn)

    c1 = Cinema("C1", "Pathé Alésia", "Paris")
    c2 = Cinema("C2", "Pathé Parnasse", "Paris")
    cin_repo.save(c1)
    cin_repo.save(c2)

    st1 = Showtime("C1", "Film A", "2026-10-18T10:00:00", "2026-10-18T12:00:00", "2026-10-18")
    st2 = Showtime("C2", "Film B", "2026-10-18T13:00:00", "2026-10-18T15:00:00", "2026-10-18")
    sht_repo.save(st1)
    sht_repo.save(st2)

    combined = sht_repo.get_showtimes(["C1", "C2"], "2026-10-18")
    assert len(combined) == 2
    titles = [s.movie_title for s in combined]
    assert titles == ["Film A", "Film B"]
    # Verify cinema_name is populated from JOIN
    assert combined[0].cinema_name == "Pathé Alésia"
    assert combined[1].cinema_name == "Pathé Parnasse"
