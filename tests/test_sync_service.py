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
    mock_movie = Movie(
        id="M1",
        title="Dune 2",
        original_title="Dune 2",
        runtime_minutes=150,
        genres=["Action"]
    )
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

def test_sync_service_is_fresh():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    mock_client = MagicMock()
    mock_client.get_daily_showtimes.return_value = []
    service = SyncService(conn, client=mock_client)

    assert service.is_cinema_fresh("B0143", for_date=date(2026, 10, 18)) is False
    service.sync_cinema("B0143", start_date=date(2026, 10, 18), days_count=1)
    assert service.is_cinema_fresh("B0143", for_date=date(2026, 10, 18)) is True

def test_sync_service_skips_when_already_fresh_if_not_forced():
    conn = sqlite3.connect(":memory:")
    init_db(conn)
    mock_client = MagicMock()
    mock_client.get_daily_showtimes.return_value = []
    service = SyncService(conn, client=mock_client)

    # First sync: performs API call
    service.sync_cinema("B0143", start_date=date(2026, 10, 18), days_count=1, force=False)
    assert mock_client.get_daily_showtimes.call_count == 1

    # Second sync without force: data is already fresh, 0 API call made!
    service.sync_cinema("B0143", start_date=date(2026, 10, 18), days_count=1, force=False)
    assert mock_client.get_daily_showtimes.call_count == 1

    # Third sync WITH force=True: forces API refresh
    service.sync_cinema("B0143", start_date=date(2026, 10, 18), days_count=1, force=True)
    assert mock_client.get_daily_showtimes.call_count == 2

def test_allocine_client_extracts_rich_formats():
    from cinepass_planner.importer.allocine_client import AllocineClient

    mock_api = MagicMock()
    mock_api._get_json_request.return_value = {
        "pagination": {"page": 1, "totalPages": 1},
        "results": [
            {
                "movie": {
                    "title": "Dune: Part Two",
                    "originalTitle": "Dune: Part Two",
                    "runtime": "2h 46min",
                    "genres": [{"translate": "Science-Fiction"}]
                },
                "showtimes": {
                    "multiple": [
                        {
                            "internalId": 101,
                            "startsAt": "2026-10-18T14:00:00",
                            "diffusionVersion": "LOCAL",
                            "experience": ["DOLBY_CINEMA", "PLF"],
                            "projection": ["DIGITAL"],
                            "tags": ["Auditorium.Experience.DolbyCinema"]
                        },
                        {
                            "internalId": 102,
                            "startsAt": "2026-10-18T17:30:00",
                            "diffusionVersion": "ORIGINAL",
                            "experience": None,
                            "projection": ["IMAX"],
                            "tags": ["Format.Projection.Imax"]
                        },
                        {
                            "internalId": 103,
                            "startsAt": "2026-10-18T20:45:00",
                            "diffusionVersion": "LOCAL",
                            "experience": ["E_4DX", "SCREEN_X", "PLF"],
                            "projection": ["F_3D"],
                            "tags": ["Auditorium.Experience.4dx", "Auditorium.Experience.ScreenX", "Format.Projection.3d"]
                        }
                    ]
                }
            }
        ]
    }

    client = AllocineClient(api=mock_api)
    results = client.get_daily_showtimes("B0143", "2026-10-18")

    assert len(results) == 1
    movie, showtimes = results[0]
    assert movie.title == "Dune: Part Two"
    assert movie.runtime_minutes == 166
    assert len(showtimes) == 3

    assert showtimes[0].format == "Dolby Cinema"
    assert showtimes[0].version == "VF"

    assert showtimes[1].format == "IMAX"
    assert showtimes[1].version == "VOST"

    assert showtimes[2].format == "4DX ScreenX 3D"
    assert showtimes[2].version == "VF"


def test_allocine_client_raises_rate_limit_error_on_429():
    import pytest
    from cinepass_planner.importer.allocine_client import AllocineClient, AllocineRateLimitError

    # 1. Direct JSON call encounters HTTP 429
    mock_api_direct = MagicMock()
    mock_api_direct._get_json_request.side_effect = Exception("429 Client Error: Too Many Requests for url")
    client_direct = AllocineClient(api=mock_api_direct)

    with pytest.raises(AllocineRateLimitError) as exc_info:
        client_direct.get_daily_showtimes("B0143", "2026-10-18")
    assert "429" in str(exc_info.value)
    # Ensure fallback was NOT called when direct call was rate limited
    mock_api_direct.get_movies.assert_not_called()

    # 2. Fallback encounters HTTP 429
    mock_api_fallback = MagicMock(spec=["get_movies", "get_showtime"])
    mock_api_fallback.get_movies.side_effect = Exception("HTTP 429: Too Many Requests")
    client_fallback = AllocineClient(api=mock_api_fallback)

    with pytest.raises(AllocineRateLimitError) as exc_info:
        client_fallback.get_daily_showtimes("B0143", "2026-10-18")
    assert "429" in str(exc_info.value)

