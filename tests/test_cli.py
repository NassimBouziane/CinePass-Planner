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
