from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from cinepass_planner.models import Showtime, Itinerary, PassType
from cinepass_planner.core.parser_utils import is_valid_transition, covers_meal_break

PREMIUM_KEYWORDS = ("IMAX", "4DX", "DOLBY", "SCREENX", "3D", "ONYX")

@dataclass
class PlanCriteria:
    cinema_id: str
    date_str: str
    target_films_count: int = 3
    start_time: str = "10:00"
    max_end_time: str = "23:00"
    priority_movies: list[str] = field(default_factory=list)
    pass_type: PassType = PassType.GOLD
    allow_supplements: bool = True
    min_buffer_minutes: int = 15
    require_meal_break: bool = True
    language: str = "ALL"  # "ALL", "VOST", "VF"
    selected_formats: list[str] = field(default_factory=list)

class Scheduler:
    def __init__(self):
        pass

    def generate_plans(self, showtimes: list[Showtime], criteria: PlanCriteria) -> list[Itinerary]:
        """
        Explore candidate showtimes using backtracking to build optimal day itineraries.
        """
        # 1. Filter candidates by time bounds, language, format, and premium supplement permissions
        dt_start_window = datetime.fromisoformat(f"{criteria.date_str}T{criteria.start_time}:00")
        dt_end_window = datetime.fromisoformat(f"{criteria.date_str}T{criteria.max_end_time}:00")

        candidates: list[Showtime] = []
        for st in showtimes:
            st_start = datetime.fromisoformat(st.starts_at)
            st_end = datetime.fromisoformat(st.ends_at)

            if st_start < dt_start_window or st_end > dt_end_window:
                continue

            # Language filter
            if criteria.language and criteria.language.upper() not in ("ALL", "TOUTES"):
                lang_upper = criteria.language.upper()
                if "VOST" in lang_upper and st.version.upper() != "VOST":
                    continue
                elif "VF" in lang_upper and st.version.upper() != "VF":
                    continue

            # Selected formats filter
            if criteria.selected_formats:
                st_fmt = st.format.upper()
                fmt_matched = any(
                    f.upper() in st_fmt or st_fmt in f.upper()
                    for f in criteria.selected_formats
                )
                if not fmt_matched:
                    continue

            # If user has non-Gold pass and refuses extra fees, filter out premium formats
            if not criteria.allow_supplements and criteria.pass_type != PassType.GOLD:
                fmt_upper = st.format.upper()
                if fmt_upper != "STANDARD" and any(k in fmt_upper for k in PREMIUM_KEYWORDS):
                    continue

            candidates.append(st)

        # Sort candidates chronologically
        candidates.sort(key=lambda s: s.starts_at)

        # 2. Try finding paths for target_count down to 1
        valid_paths: list[list[Showtime]] = []
        desired_count = criteria.target_films_count

        while desired_count >= 1 and not valid_paths:
            valid_paths = self._find_paths(candidates, desired_count, criteria.min_buffer_minutes)
            if not valid_paths:
                desired_count -= 1

        if not valid_paths:
            return []

        # 3. Build Itineraries and calculate score
        itineraries: list[Itinerary] = []
        priority_set = {p.strip().lower() for p in criteria.priority_movies}

        for path in valid_paths:
            # Check meal break coverage
            has_meal = False
            for i in range(len(path) - 1):
                if covers_meal_break(path[i], path[i + 1]):
                    has_meal = True
                    break

            if criteria.require_meal_break and not has_meal and len(path) > 1:
                # If meal break required, only keep paths that have it if any exist
                # Will be ranked lower or filtered
                pass

            # Calculate durations and idle time
            total_movie_min = 0
            total_idle_min = 0
            for i, st in enumerate(path):
                m_duration = int((datetime.fromisoformat(st.ends_at) - datetime.fromisoformat(st.starts_at)).total_seconds() / 60)
                total_movie_min += m_duration

                if i > 0:
                    prev_end = datetime.fromisoformat(path[i - 1].ends_at)
                    curr_start = datetime.fromisoformat(st.starts_at)
                    total_idle_min += int((curr_start - prev_end).total_seconds() / 60)

            # Scoring
            score = 0.0
            # Priority movies bonus
            for st in path:
                if st.movie_title.lower() in priority_set:
                    score += 1000.0

            # Premium experience bonus: boost Dolby Cinema, IMAX, 4DX, ScreenX, etc.
            for st in path:
                if st.format.upper() != "STANDARD":
                    score += 250.0

            # Meal break score
            if has_meal:
                score += 300.0
            elif criteria.require_meal_break and len(path) > 1:
                score -= 500.0

            # Moderate transition penalty (prefer compact transitions around 15-30m)
            score -= (total_idle_min * 0.5)

            itineraries.append(Itinerary(
                showtimes=path,
                total_movie_minutes=total_movie_min,
                total_pause_minutes=total_idle_min,
                score=score,
                has_meal_break=has_meal
            ))

        # Sort by score descending
        itineraries.sort(key=lambda it: it.score, reverse=True)

        # Filter out identical time structures and return top 3
        unique_itineraries: list[Itinerary] = []
        seen_signatures: set[str] = set()

        for it in itineraries:
            sig = "-".join(f"{s.movie_title}@{s.starts_at}" for s in it.showtimes)
            if sig not in seen_signatures:
                seen_signatures.add(sig)
                unique_itineraries.append(it)
            if len(unique_itineraries) >= 3:
                break

        return unique_itineraries

    def _find_paths(self, candidates: list[Showtime], target_count: int, min_buffer: int) -> list[list[Showtime]]:
        """Backtracking search for all valid sequences of length target_count."""
        results: list[list[Showtime]] = []

        def backtrack(current_path: list[Showtime], start_idx: int, seen_movies: set[str]):
            if len(current_path) == target_count:
                results.append(list(current_path))
                return

            for i in range(start_idx, len(candidates)):
                cand = candidates[i]
                if cand.movie_title in seen_movies:
                    continue

                if current_path:
                    if not is_valid_transition(current_path[-1], cand, min_buffer):
                        continue

                current_path.append(cand)
                seen_movies.add(cand.movie_title)

                backtrack(current_path, i + 1, seen_movies)

                seen_movies.remove(cand.movie_title)
                current_path.pop()

        backtrack([], 0, set())
        return results
