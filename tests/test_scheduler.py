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
    s_c1 = Showtime(cinema_id="C1", movie_title="Film C", starts_at="2026-10-18T16:20:00", ends_at="2026-10-18T18:20:00", date_str="2026-10-18", format="Standard")
    # Film D (Standard, 2h)
    s_d1 = Showtime(cinema_id="C1", movie_title="Film D", starts_at="2026-10-18T18:35:00", ends_at="2026-10-18T20:35:00", date_str="2026-10-18", format="Standard")
    return [s_a1, s_b1, s_b2, s_c1, s_d1]

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
    assert "Film B" in titles
    # No duplicates
    assert len(set(titles)) == len(titles)

def test_scheduler_filters_out_supplements_when_disallowed(sample_showtimes):
    scheduler = Scheduler()
    # Pass Silver, supplements refused -> IMAX must be excluded
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

def test_scheduler_respects_meal_break(sample_showtimes):
    scheduler = Scheduler()
    # s_a1 ends at 12:00, s_b2 starts at 14:00 (2h gap covering lunch!)
    criteria = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=2,
        start_time="09:00",
        max_end_time="17:00",
        priority_movies=[],
        pass_type=PassType.GOLD,
        allow_supplements=True,
        min_buffer_minutes=15,
        require_meal_break=True
    )
    results = scheduler.generate_plans(sample_showtimes, criteria)
    assert len(results) >= 1
    best = results[0]
    assert best.has_meal_break is True
    titles = [s.movie_title for s in best.showtimes]
    assert titles == ["Film A", "Film B"]

def test_scheduler_impossible_window_falls_back():
    scheduler = Scheduler()
    # Only 2 films in window, but user asked for 4
    s1 = Showtime("C1", "Film 1", "2026-10-18T10:00:00", "2026-10-18T12:00:00", "2026-10-18")
    s2 = Showtime("C1", "Film 2", "2026-10-18T12:15:00", "2026-10-18T14:15:00", "2026-10-18")
    criteria = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=4,
        start_time="10:00",
        max_end_time="15:00",
        priority_movies=[],
        pass_type=PassType.GOLD,
        allow_supplements=True,
        min_buffer_minutes=15,
        require_meal_break=False
    )
    results = scheduler.generate_plans([s1, s2], criteria)
    # Should fall back gracefully to the max achievable (2 films) rather than failing
    assert len(results) >= 1
    assert len(results[0].showtimes) == 2

def test_scheduler_filters_by_language():
    scheduler = Scheduler()
    s_vost = Showtime("C1", "Dune VOST", "2026-10-18T10:00:00", "2026-10-18T12:00:00", "2026-10-18", version="VOST")
    s_vf = Showtime("C1", "Dune VF", "2026-10-18T10:00:00", "2026-10-18T12:00:00", "2026-10-18", version="VF")

    # Filter VOST only
    crit_vost = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=1,
        language="VOST",
        require_meal_break=False
    )
    res_vost = scheduler.generate_plans([s_vost, s_vf], crit_vost)
    assert len(res_vost) == 1
    assert res_vost[0].showtimes[0].version == "VOST"

    # Filter VF only
    crit_vf = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=1,
        language="VF",
        require_meal_break=False
    )
    res_vf = scheduler.generate_plans([s_vost, s_vf], crit_vf)
    assert len(res_vf) == 1
    assert res_vf[0].showtimes[0].version == "VF"

def test_scheduler_filters_by_selected_formats():
    scheduler = Scheduler()
    s_dolby = Showtime("C1", "Verity", "2026-10-18T13:45:00", "2026-10-18T15:45:00", "2026-10-18", format="Dolby Cinema")
    s_std = Showtime("C1", "Garance", "2026-10-18T13:45:00", "2026-10-18T15:45:00", "2026-10-18", format="Standard")

    crit = PlanCriteria(
        cinema_id="C1",
        date_str="2026-10-18",
        target_films_count=1,
        selected_formats=["Dolby Cinema"],
        require_meal_break=False
    )
    res = scheduler.generate_plans([s_dolby, s_std], crit)
    assert len(res) == 1
    assert res[0].showtimes[0].format == "Dolby Cinema"

