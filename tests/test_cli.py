from typer.testing import CliRunner
from unittest.mock import patch, MagicMock
from cinepass_planner.cli.main import app
from cinepass_planner.models import Cinema, Showtime, Itinerary, PassType

runner = CliRunner()

def test_cli_help():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "CinéPass" in result.stdout or "cinemas" in result.stdout

def test_cli_cinemas_command():
    with patch("cinepass_planner.cli.main.CinemaRepository") as MockRepo:
        mock_instance = MockRepo.return_value
        mock_instance.list_all.return_value = [
            Cinema("B0143", "Pathé Belle Epine", "Thiais", "", "Pathé", True, True, True)
        ]
        result = runner.invoke(app, ["cinemas"])
        assert result.exit_code == 0
        assert "Pathé Belle Epine" in result.stdout

def test_cli_plan_command():
    with patch("cinepass_planner.cli.main.CinemaRepository") as MockCinRepo, \
         patch("cinepass_planner.cli.main.ShowtimeRepository") as MockShtRepo, \
         patch("cinepass_planner.cli.main.Scheduler") as MockScheduler:
        
        MockCinRepo.return_value.get_by_id.return_value = Cinema("B0143", "Pathé Belle Epine", "Thiais")
        MockCinRepo.return_value.list_all.return_value = [Cinema("B0143", "Pathé Belle Epine", "Thiais")]
        
        mock_itinerary = Itinerary(
            showtimes=[
                Showtime("B0143", "Dune 2", "2026-10-18T10:15:00", "2026-10-18T12:45:00", "2026-10-18", "ORIGINAL", "Dolby Cinema")
            ],
            total_movie_minutes=150,
            total_pause_minutes=0,
            score=100.0
        )
        MockScheduler.return_value.generate_plans.return_value = [mock_itinerary]

        result = runner.invoke(app, [
            "plan",
            "--cinema", "B0143",
            "--date", "2026-10-18",
            "--films", "1"
        ])
        assert result.exit_code == 0
        assert "Dune 2" in result.stdout
        assert "10:15" in result.stdout


def test_cli_sync_all_command():
    from cinepass_planner.importer.allocine_client import AllocineRateLimitError

    with patch("cinepass_planner.cli.main.CinemaRepository") as MockCinRepo, \
         patch("cinepass_planner.cli.main.SyncService") as MockSyncService, \
         patch("cinepass_planner.cli.main.time.sleep") as mock_sleep, \
         patch("cinepass_planner.cli.main.random.uniform", return_value=2.5) as mock_random:

        MockCinRepo.return_value.list_all.return_value = [
            Cinema("B0143", "Pathé Belle Epine", "Thiais"),
            Cinema("IND_test", "Cinéma Indépendant", "Paris"),
            Cinema("P0103", "Pathé Wepler", "Paris")
        ]

        MockSyncService.return_value.is_cinema_fresh.return_value = False
        # First cinema succeeds, second is skipped (IND_), third hits rate limit twice (initial + retry)
        MockSyncService.return_value.sync_cinema.side_effect = [
            25,
            AllocineRateLimitError("429 Too Many Requests"),
            AllocineRateLimitError("429 Too Many Requests")
        ]

        result = runner.invoke(app, [
            "sync-all",
            "--days", "2",
            "--min-delay", "1.0",
            "--max-delay", "5.0"
        ])

        assert result.exit_code == 0
        assert "Pathé Belle Epine : 25 séances" in result.stdout
        assert "Rate limit Allociné détecté" in result.stdout
        assert "1 cinémas indépendants sans code Allociné ignorés" in " ".join(result.stdout.split())

        # Verify random delay was sampled between 1.0 and 5.0
        mock_random.assert_called_with(1.0, 5.0)
        # Sleep called with 2.5 (from random delay) and 30 (from 429 rate limit backoff)
        mock_sleep.assert_any_call(2.5)
        mock_sleep.assert_any_call(30)


def test_cli_sync_all_respects_batch_size():
    with patch("cinepass_planner.cli.main.CinemaRepository") as MockCinRepo, \
         patch("cinepass_planner.cli.main.SyncService") as MockSyncService, \
         patch("cinepass_planner.cli.main.time.sleep"):

        MockCinRepo.return_value.list_all.return_value = [
            Cinema("C1", "Cinema 1", "Paris"),
            Cinema("C2", "Cinema 2", "Paris"),
            Cinema("C3", "Cinema 3", "Paris"),
            Cinema("C4", "Cinema 4", "Paris")
        ]

        MockSyncService.return_value.is_cinema_fresh.return_value = False
        MockSyncService.return_value.sync_cinema.return_value = 10

        result = runner.invoke(app, [
            "sync-all",
            "--batch-size", "2",
            "--min-delay", "0",
            "--max-delay", "0"
        ])

        assert result.exit_code == 0
        assert "Lot de 2 cinémas terminé" in result.stdout
        # Only 2 cinemas should have been synced because batch_size=2
        assert MockSyncService.return_value.sync_cinema.call_count == 2


def test_cli_sync_all_loop_batches():
    with patch("cinepass_planner.cli.main.CinemaRepository") as MockCinRepo, \
         patch("cinepass_planner.cli.main.SyncService") as MockSyncService, \
         patch("cinepass_planner.cli.main.time.sleep") as mock_sleep:

        MockCinRepo.return_value.list_all.return_value = [
            Cinema("C1", "Cinema 1", "Paris"),
            Cinema("C2", "Cinema 2", "Paris"),
            Cinema("C3", "Cinema 3", "Paris"),
            Cinema("C4", "Cinema 4", "Paris")
        ]

        MockSyncService.return_value.is_cinema_fresh.return_value = False
        MockSyncService.return_value.sync_cinema.return_value = 10

        result = runner.invoke(app, [
            "sync-all",
            "--batch-size", "2",
            "--loop-batches",
            "--batch-pause", "15",
            "--min-delay", "0",
            "--max-delay", "0"
        ])

        assert result.exit_code == 0
        assert "pause de sécurité de 15s" in result.stdout.lower()
        # All 4 cinemas should have been synced across 2 batches
        assert MockSyncService.return_value.sync_cinema.call_count == 4
        # Pauses between batches should have been called with 15.0
        mock_sleep.assert_any_call(15.0)


def test_cli_refresh_ratings_command(tmp_path):
    with patch("cinepass_planner.cli.main.refresh_all_ratings", return_value=5) as mock_refresh:
        dummy_dir = tmp_path / "data"
        dummy_dir.mkdir()
        dummy_file = dummy_dir / "ratings.json"

        result = runner.invoke(app, [
            "refresh-ratings",
            "--showtimes-dir", str(dummy_dir),
            "--output-file", str(dummy_file),
            "--ttl-days", "3",
            "--force"
        ])

        assert result.exit_code == 0
        assert "5 films rafraichis" in result.stdout
        mock_refresh.assert_called_once_with(
            showtimes_dir=dummy_dir,
            output_file=dummy_file,
            ttl_days=3,
            force=True
        )




