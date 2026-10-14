import logging
from typing import Optional
from allocineAPI.allocineAPI import allocineAPI, URLs
from cinepass_planner.core.parser_utils import (
    parse_runtime_to_minutes,
    compute_end_time,
    determine_showtime_format
)
from cinepass_planner.models import Movie, Showtime

logger = logging.getLogger(__name__)

class AllocineClient:
    def __init__(self, api: Optional[allocineAPI] = None):
        self.api = api or allocineAPI()

    def get_daily_showtimes(self, cinema_id: str, date_str: str) -> list[tuple[Movie, list[Showtime]]]:
        """
        Fetch movies and showtimes for a cinema on a specific date.
        Extracts rich format attributes (IMAX, Dolby Cinema, 4DX, ScreenX, 3D, etc.).
        Returns list of (Movie, [Showtime]).
        """
        results: list[tuple[Movie, list[Showtime]]] = []

        # 1. Direct rich JSON extraction from Allociné
        try:
            if hasattr(self.api, "_get_json_request"):
                page, total_pages = 0, 1
                raw_elements: list[dict] = []
                while page < total_pages:
                    url = URLs.showtime_url(cinema_id, date_str, page + 1)
                    json_data = self.api._get_json_request(url)
                    pagination = json_data.get("pagination", {})
                    page = int(pagination.get("page", 1))
                    total_pages = int(pagination.get("totalPages", 1))
                    raw_elements.extend(json_data.get("results", []))

                for element in raw_elements:
                    movie_data = element.get("movie") or {}
                    title = movie_data.get("title") or "Titre inconnu"
                    original_title = movie_data.get("originalTitle") or ""
                    runtime_raw = movie_data.get("runtime")
                    runtime_min = parse_runtime_to_minutes(runtime_raw)

                    # Genres
                    genres_raw = movie_data.get("genres") or []
                    genres = [
                        g.get("translate", g.get("tag", "")) if isinstance(g, dict) else str(g)
                        for g in genres_raw
                    ]

                    # Poster
                    poster_data = movie_data.get("poster")
                    poster_url = ""
                    if isinstance(poster_data, dict):
                        poster_url = poster_data.get("url") or ""
                    elif isinstance(poster_data, str):
                        poster_url = poster_data

                    synopsis = movie_data.get("synopsisFull") or movie_data.get("synopsis") or ""

                    movie = Movie(
                        id=f"MOV_{abs(hash(title)) % 10000000}",
                        title=title,
                        original_title=original_title,
                        runtime_minutes=runtime_min,
                        genres=genres,
                        director="",
                        poster_url=poster_url,
                        synopsis=synopsis
                    )

                    showtimes_dict = element.get("showtimes") or {}
                    showtime_objs: list[Showtime] = []
                    seen_internal_ids: set[int] = set()

                    if isinstance(showtimes_dict, dict):
                        for _, st_list in showtimes_dict.items():
                            if not isinstance(st_list, list):
                                continue
                            for st in st_list:
                                int_id = st.get("internalId")
                                if int_id and int_id in seen_internal_ids:
                                    continue
                                if int_id:
                                    seen_internal_ids.add(int_id)

                                starts_at = st.get("startsAt")
                                if not starts_at:
                                    continue

                                ends_at = compute_end_time(starts_at, movie.runtime_minutes)
                                version_raw = str(st.get("diffusionVersion", "LOCAL")).upper()
                                version = "VOST" if "ORIGINAL" in version_raw else "VF"

                                fmt = determine_showtime_format(
                                    experience=st.get("experience"),
                                    projection=st.get("projection"),
                                    tags=st.get("tags"),
                                    title=title
                                )

                                showtime_objs.append(Showtime(
                                    cinema_id=cinema_id,
                                    movie_title=movie.title,
                                    starts_at=starts_at,
                                    ends_at=ends_at,
                                    date_str=date_str,
                                    version=version,
                                    format=fmt
                                ))

                    if showtime_objs:
                        results.append((movie, showtime_objs))

                if results:
                    return results
        except Exception as e:
            logger.warning(f"Direct Allociné JSON fetching failed for {cinema_id} ({e}), falling back...")

        # 2. Fallback to standard get_movies + get_showtime methods
        try:
            raw_movies = self.api.get_movies(cinema_id, date_str) or []
            raw_showtimes = self.api.get_showtime(cinema_id, date_str) or []
        except Exception as e:
            logger.warning(f"Failed to fetch Allociné showtimes fallback for {cinema_id} on {date_str}: {e}")
            return results

        movies_by_title: dict[str, Movie] = {}
        for m in raw_movies:
            title = m.get("title") or "Titre inconnu"
            runtime_raw = m.get("runtime")
            runtime_min = parse_runtime_to_minutes(runtime_raw)
            movie = Movie(
                id=f"MOV_{abs(hash(title)) % 10000000}",
                title=title,
                original_title=m.get("originalTitle") or "",
                runtime_minutes=runtime_min,
                genres=m.get("genres") or [],
                director=m.get("director") or "",
                poster_url=m.get("urlPoster") or "",
                synopsis=m.get("synopsisFull") or ""
            )
            movies_by_title[title.lower()] = movie

        for entry in raw_showtimes:
            movie_title = entry.get("title") or "Titre inconnu"
            norm_title = movie_title.lower()

            movie = movies_by_title.get(norm_title)
            if not movie:
                movie = Movie(
                    id=f"MOV_{abs(hash(movie_title)) % 10000000}",
                    title=movie_title,
                    runtime_minutes=120
                )
                movies_by_title[norm_title] = movie

            showtime_objs: list[Showtime] = []
            for st in entry.get("showtimes") or []:
                starts_at = st.get("startsAt")
                if not starts_at:
                    continue

                ends_at = compute_end_time(starts_at, movie.runtime_minutes)
                version_raw = st.get("diffusionVersion", "ORIGINAL")
                version = "VOST" if "ORIGINAL" in str(version_raw).upper() else "VF"

                fmt = determine_showtime_format(
                    experience=st.get("experience"),
                    projection=st.get("projection"),
                    tags=st.get("tags"),
                    title=movie_title
                )

                showtime_objs.append(Showtime(
                    cinema_id=cinema_id,
                    movie_title=movie.title,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    date_str=date_str,
                    version=version,
                    format=fmt
                ))

            if showtime_objs:
                results.append((movie, showtime_objs))

        return results

