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
    assert parse_runtime_to_minutes(0) == 120
    assert parse_runtime_to_minutes("inconnu") == 120

def test_compute_end_time():
    assert compute_end_time("2026-10-18T10:15:00", 150) == "2026-10-18T12:45:00"
    assert compute_end_time("2026-10-18T14:00:00", 125) == "2026-10-18T16:05:00"

def test_is_valid_transition():
    s1 = Showtime(cinema_id="C1", movie_title="Film 1", starts_at="2026-10-18T10:00:00", ends_at="2026-10-18T12:00:00", date_str="2026-10-18")
    s2 = Showtime(cinema_id="C1", movie_title="Film 2", starts_at="2026-10-18T12:15:00", ends_at="2026-10-18T14:00:00", date_str="2026-10-18")
    s_exact = Showtime(cinema_id="C1", movie_title="Film 2", starts_at="2026-10-18T12:15:00", ends_at="2026-10-18T14:00:00", date_str="2026-10-18")
    s_too_early = Showtime(cinema_id="C1", movie_title="Film 3", starts_at="2026-10-18T12:14:00", ends_at="2026-10-18T14:00:00", date_str="2026-10-18")
    
    # Review focus #5: exact boundary condition (starts_at == ends_at + buffer)
    assert is_valid_transition(s1, s_exact, min_buffer_minutes=15) is True
    assert is_valid_transition(s1, s2, min_buffer_minutes=15) is True
    assert is_valid_transition(s1, s_too_early, min_buffer_minutes=15) is False

def test_covers_meal_break():
    # Lunch break 12h00 - 14h00
    s1 = Showtime(cinema_id="C1", movie_title="Matin", starts_at="2026-10-18T10:00:00", ends_at="2026-10-18T12:30:00", date_str="2026-10-18")
    s2 = Showtime(cinema_id="C1", movie_title="Apres-midi", starts_at="2026-10-18T13:45:00", ends_at="2026-10-18T15:30:00", date_str="2026-10-18")
    assert covers_meal_break(s1, s2, min_pause_minutes=60) is True

    # Dinner break 19h00 - 21h00
    s3 = Showtime(cinema_id="C1", movie_title="Aprem", starts_at="2026-10-18T16:00:00", ends_at="2026-10-18T18:45:00", date_str="2026-10-18")
    s4 = Showtime(cinema_id="C1", movie_title="Soir", starts_at="2026-10-18T20:00:00", ends_at="2026-10-18T22:00:00", date_str="2026-10-18")
    assert covers_meal_break(s3, s4, min_pause_minutes=60) is True

    # No meal break (only 20 min transition)
    s5 = Showtime(cinema_id="C1", movie_title="Aprem 2", starts_at="2026-10-18T16:00:00", ends_at="2026-10-18T18:00:00", date_str="2026-10-18")
    s6 = Showtime(cinema_id="C1", movie_title="Soir 2", starts_at="2026-10-18T18:20:00", ends_at="2026-10-18T20:20:00", date_str="2026-10-18")
    assert covers_meal_break(s5, s6, min_pause_minutes=45) is False

def test_determine_showtime_format():
    from cinepass_planner.core.parser_utils import determine_showtime_format

    # IMAX
    assert determine_showtime_format(projection=["IMAX"]) == "IMAX"
    assert determine_showtime_format(tags=["Format.Projection.Imax"]) == "IMAX"
    assert determine_showtime_format(projection=["IMAX", "F_3D"]) == "IMAX 3D"
    assert determine_showtime_format(projection=["IMAX", "LASER"]) == "IMAX Laser"

    # Dolby Cinema
    assert determine_showtime_format(experience=["DOLBY_CINEMA", "PLF"]) == "Dolby Cinema"
    assert determine_showtime_format(tags=["Auditorium.Experience.DolbyCinema"]) == "Dolby Cinema"
    assert determine_showtime_format(experience=["DOLBY_CINEMA", "PLF"], projection=["F_3D"]) == "Dolby Cinema 3D"

    # 4DX
    assert determine_showtime_format(experience=["E_4DX", "PLF"]) == "4DX"
    assert determine_showtime_format(experience=["E_4DX", "PLF"], projection=["F_3D"]) == "4DX 3D"

    # ScreenX
    assert determine_showtime_format(experience=["SCREEN_X"]) == "ScreenX"

    # 4DX ScreenX combined
    assert determine_showtime_format(experience=["E_4DX", "SCREEN_X", "PLF"]) == "4DX ScreenX"
    assert determine_showtime_format(experience=["E_4DX", "SCREEN_X", "PLF"], projection=["F_3D"]) == "4DX ScreenX 3D"

    # Dolby Atmos
    assert determine_showtime_format(experience=["DOLBY_ATMOS"]) == "Dolby Atmos"

    # Onyx LED
    assert determine_showtime_format(experience=["ONYX_LED", "PLF"]) == "Onyx LED"

    # 3D only
    assert determine_showtime_format(projection=["F_3D"]) == "3D"
    assert determine_showtime_format(projection=["REALD_3D"]) == "3D"

    # Standard
    assert determine_showtime_format(projection=["DIGITAL"]) == "Standard"
    assert determine_showtime_format() == "Standard"

    # Premium / PLF
    assert determine_showtime_format(experience=["PLF"]) == "Premium"
    assert determine_showtime_format(tags=["Auditorium.Experience.PLF"]) == "Premium"
    assert determine_showtime_format(title="Film Salle Premium") == "Premium"

    # Title fallback
    assert determine_showtime_format(title="Avengers Endgame IMAX 3D") == "IMAX 3D"

