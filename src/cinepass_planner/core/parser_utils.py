import re
from datetime import datetime, timedelta
from typing import Any, Optional
from cinepass_planner.config import DEFAULT_FALLBACK_RUNTIME_MINUTES
from cinepass_planner.models import Showtime

def parse_runtime_to_minutes(runtime_val: Any) -> int:
    """
    Parse Allociné runtime strings like '1h 52min', '2h', '45min', or integer minutes.
    Falls back gracefully to DEFAULT_FALLBACK_RUNTIME_MINUTES (120) if None, 0, or unparseable.
    """
    if runtime_val is None or runtime_val == 0:
        return DEFAULT_FALLBACK_RUNTIME_MINUTES

    if isinstance(runtime_val, int):
        return runtime_val if runtime_val > 0 else DEFAULT_FALLBACK_RUNTIME_MINUTES

    runtime_str = str(runtime_val).strip()
    if not runtime_str:
        return DEFAULT_FALLBACK_RUNTIME_MINUTES

    # Matches "1h 52min", "2h", "45min", "1h52"
    hours = 0
    minutes = 0

    h_match = re.search(r"(\d+)\s*h", runtime_str, re.IGNORECASE)
    if h_match:
        hours = int(h_match.group(1))

    m_match = re.search(r"(\d+)\s*min", runtime_str, re.IGNORECASE)
    if m_match:
        minutes = int(m_match.group(1))
    elif not h_match:
        # Check if it's purely digits e.g. "112"
        digits_match = re.match(r"^(\d+)$", runtime_str)
        if digits_match:
            total = int(digits_match.group(1))
            return total if total > 0 else DEFAULT_FALLBACK_RUNTIME_MINUTES

    total = hours * 60 + minutes
    return total if total > 0 else DEFAULT_FALLBACK_RUNTIME_MINUTES

def compute_end_time(start_iso: str, runtime_minutes: int) -> str:
    """Calculate ISO format ends_at by adding runtime_minutes to starts_at."""
    dt = datetime.fromisoformat(start_iso)
    dt_end = dt + timedelta(minutes=runtime_minutes)
    return dt_end.isoformat()

def is_valid_transition(s1: Showtime, s2: Showtime, min_buffer_minutes: int = 15) -> bool:
    """
    Check if s2 starts at or after s1 ends + min_buffer_minutes.
    Exact boundary condition: starts_at(s2) >= ends_at(s1) + timedelta(minutes=min_buffer_minutes).
    """
    dt_s1_end = datetime.fromisoformat(s1.ends_at)
    dt_s2_start = datetime.fromisoformat(s2.starts_at)
    min_allowed_start = dt_s1_end + timedelta(minutes=min_buffer_minutes)
    return dt_s2_start >= min_allowed_start

def covers_meal_break(s1: Showtime, s2: Showtime, min_pause_minutes: int = 45) -> bool:
    """
    Check if the gap between s1 and s2 covers a meal window:
    - Lunch: 12:00 to 14:00
    - Dinner: 19:00 to 21:00
    and provides at least min_pause_minutes of free time.
    """
    dt_s1_end = datetime.fromisoformat(s1.ends_at)
    dt_s2_start = datetime.fromisoformat(s2.starts_at)

    gap_minutes = (dt_s2_start - dt_s1_end).total_seconds() / 60
    if gap_minutes < min_pause_minutes:
        return False

    # Check lunch window: overlap between [dt_s1_end, dt_s2_start] and [12:00, 14:00]
    date_day = dt_s1_end.date()
    lunch_start = datetime.combine(date_day, datetime.strptime("12:00", "%H:%M").time())
    lunch_end = datetime.combine(date_day, datetime.strptime("14:00", "%H:%M").time())

    # Check dinner window: overlap between [dt_s1_end, dt_s2_start] and [19:00, 21:00]
    dinner_start = datetime.combine(date_day, datetime.strptime("19:00", "%H:%M").time())
    dinner_end = datetime.combine(date_day, datetime.strptime("21:00", "%H:%M").time())

    def window_overlap_minutes(w_start, w_end):
        overlap_start = max(dt_s1_end, w_start)
        overlap_end = min(dt_s2_start, w_end)
        if overlap_end > overlap_start:
            return (overlap_end - overlap_start).total_seconds() / 60
        return 0

    if window_overlap_minutes(lunch_start, lunch_end) >= min_pause_minutes:
        return True

    if window_overlap_minutes(dinner_start, dinner_end) >= min_pause_minutes:
        return True

    return False

def determine_showtime_format(
    experience: Optional[list[str]] = None,
    projection: Optional[list[str]] = None,
    tags: Optional[list[str]] = None,
    title: str = ""
) -> str:
    """
    Determine the cinema projection / auditorium format based on Allociné attributes:
    - experience: e.g. ['DOLBY_CINEMA', 'PLF'], ['E_4DX', 'SCREEN_X', 'PLF'], ['DOLBY_ATMOS'], ['ONYX_LED']
    - projection: e.g. ['DIGITAL'], ['F_3D'], ['IMAX'], ['LASER'], ['REALD_3D']
    - tags: e.g. ['Auditorium.Experience.DolbyCinema', 'Format.Projection.Imax', 'Format.Projection.3d']
    - title: fallback keyword match from movie title
    """
    exp_set = {str(x).upper() for x in (experience or [])}
    proj_set = {str(x).upper() for x in (projection or [])}
    tags_lower = [str(x).lower() for x in (tags or [])]
    tags_str = " ".join(tags_lower)
    title_lower = title.lower()

    # 3D check
    is_3d = (
        "F_3D" in proj_set
        or "REALD_3D" in proj_set
        or "3D" in proj_set
        or "format.projection.3d" in tags_str
        or " 3d" in title_lower
        or "3d" in title_lower.split()
    )

    # Laser check
    is_laser = (
        "LASER" in proj_set
        or "format.projection.laser" in tags_str
        or "laser" in tags_str
        or "laser" in title_lower
    )

    # Primary experiences
    is_4dx = "E_4DX" in exp_set or "auditorium.experience.4dx" in tags_str or "4dx" in tags_str or "4dx" in title_lower
    is_screenx = "SCREEN_X" in exp_set or "auditorium.experience.screenx" in tags_str or "screenx" in tags_str or "screenx" in title_lower
    is_imax = "IMAX" in proj_set or "IMAX" in exp_set or "format.projection.imax" in tags_str or "imax" in tags_str or "imax" in title_lower
    is_dolby_cinema = "DOLBY_CINEMA" in exp_set or "auditorium.experience.dolbycinema" in tags_str or "dolby cinema" in title_lower
    is_dolby_atmos = "DOLBY_ATMOS" in exp_set or "auditorium.experience.dolbyatmos" in tags_str or "dolby atmos" in title_lower
    is_onyx = "ONYX_LED" in exp_set or "auditorium.experience.onyxled" in tags_str or "onyx" in title_lower
    is_premium = (
        "PLF" in exp_set
        or "PREMIUM" in exp_set
        or "auditorium.experience.plf" in tags_str
        or "premium" in tags_str
        or "plf" in tags_str
        or "premium" in title_lower
    )

    if is_4dx and is_screenx:
        base = "4DX ScreenX"
    elif is_imax:
        base = "IMAX Laser" if is_laser else "IMAX"
    elif is_dolby_cinema:
        base = "Dolby Cinema"
    elif is_4dx:
        base = "4DX"
    elif is_screenx:
        base = "ScreenX"
    elif is_dolby_atmos:
        base = "Dolby Atmos"
    elif is_onyx:
        base = "Onyx LED"
    elif is_laser:
        base = "Laser"
    elif is_premium:
        base = "Premium"
    else:
        base = "Standard"

    if is_3d:
        if base == "Standard":
            return "3D"
        else:
            return f"{base} 3D"

    return base

