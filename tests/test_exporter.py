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
