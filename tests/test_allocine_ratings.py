from pathlib import Path
import sys
import pytest
from cinepass_planner.importer.allocine_client import (
    parse_ratings_from_html,
    extract_movie_titles_from_json_files,
    AllocineClient,
)
from cinepass_planner.models import Movie

def test_parse_ratings_both_press_and_spectators():
    html = """
    <div class="entity-card">
        <a class="meta-title-link">Hunger Games</a>
        <div class="rating-item-content">Presse \n3,4</div>
        <div class="rating-item-content">Spectateurs \n3,8</div>
    </div>
    """
    res = parse_ratings_from_html(html, target_title="Hunger Games")
    assert res == {"user_rating": 3.8, "press_rating": 3.4}

def test_parse_ratings_only_spectators():
    html = """
    <div class="entity-card">
        <a class="meta-title-link">Blockbuster Inédit</a>
        <div class="rating-item-content">Presse \n--</div>
        <div class="rating-item-content">Spectateurs \n4,1</div>
    </div>
    """
    res = parse_ratings_from_html(html, target_title="Blockbuster Inédit")
    assert res == {"user_rating": 4.1, "press_rating": None}

def test_parse_ratings_not_found():
    html = "<div class='no-results'>Aucun résultat</div>"
    res = parse_ratings_from_html(html, target_title="Film Inconnu")
    assert res == {"user_rating": None, "press_rating": None}

def test_extract_movie_titles(tmp_path):
    f1 = tmp_path / "showtimes-2026-10-18.json"
    f1.write_text('{"P0140": [{"title": "Film A"}, {"title": "Film B"}]}', encoding="utf-8")
    titles = extract_movie_titles_from_json_files(tmp_path)
    assert set(titles) == {"Film A", "Film B"}


def test_script_refresh_ratings_help():
    import subprocess
    base_dir = Path(__file__).resolve().parent.parent
    script_path = base_dir / "scripts" / "refresh_ratings.py"
    proc = subprocess.run(
        [sys.executable, str(script_path), "--help"],
        capture_output=True,
        text=True,
        check=True,
    )
    output = proc.stdout + proc.stderr
    assert "--showtimes-dir" in output
    assert "--output-file" in output
    assert "--force" in output
    assert "--ttl-days" in output


def test_script_refresh_ratings_execution(tmp_path):
    import subprocess
    base_dir = Path(__file__).resolve().parent.parent
    script_path = base_dir / "scripts" / "refresh_ratings.py"
    showtimes_dir = tmp_path / "data"
    showtimes_dir.mkdir()
    (showtimes_dir / "showtimes-2026-10-18.json").write_text(
        '{"P001": []}', encoding="utf-8"
    )
    output_file = showtimes_dir / "ratings.json"

    proc = subprocess.run(
        [
            sys.executable,
            str(script_path),
            "--showtimes-dir",
            str(showtimes_dir),
            "--output-file",
            str(output_file),
            "--ttl-days",
            "5",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    output = proc.stdout + proc.stderr
    assert "Starting Allociné ratings refresh at" in output
    assert "Movies refreshed: 0" in output
    assert output_file.exists()


def test_allocine_client_extracts_movie_ratings():
    class DummyAPI:
        def _get_json_request(self, url):
            return {
                "pagination": {"page": 1, "totalPages": 1},
                "results": [
                    {
                        "movie": {
                            "title": "Dune 2",
                            "stats": {
                                "userRating": {"score": 4.41},
                                "pressReview": {"score": 4.12},
                            },
                            "runtime": "2 h 46 min",
                        },
                        "showtimes": {
                            "multiple": [
                                {
                                    "internalId": 12345,
                                    "startsAt": "2026-10-20T14:00:00",
                                }
                            ]
                        },
                    }
                ],
            }

    client = AllocineClient(api=DummyAPI())
    res = client.get_daily_showtimes("P0084", "2026-10-20")
    assert len(res) == 1
    movie, showtimes = res[0]
    assert movie.title == "Dune 2"
    assert movie.user_rating == 4.4
    assert movie.press_rating == 4.1

