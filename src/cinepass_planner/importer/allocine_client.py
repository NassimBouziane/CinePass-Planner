import hashlib
import json
import logging
import re
import sqlite3
import random
import time
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
from bs4 import BeautifulSoup
import requests
from allocineAPI.allocineAPI import allocineAPI, URLs
from cinepass_planner.core.parser_utils import (
    parse_runtime_to_minutes,
    compute_end_time,
    determine_showtime_format
)
from cinepass_planner.models import Movie, Showtime

logger = logging.getLogger(__name__)


def generate_movie_id(title: str) -> str:
    """Generate a deterministic movie ID from title across all Python runs."""
    norm = title.strip().lower().encode("utf-8")
    return f"MOV_{hashlib.md5(norm).hexdigest()[:10]}"


class AllocineRateLimitError(Exception):
    """Exception levée en cas de limitation de débit HTTP 429 par Allociné."""
    pass


def parse_ratings_from_html(html: str, target_title: str) -> dict[str, Optional[float]]:
    """
    Parses Allociné search HTML to extract spectator and press ratings for the movie.
    Returns: {"user_rating": float | None, "press_rating": float | None}
    """
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".entity-card")
    if not cards:
        press_r: Optional[float] = None
        user_r: Optional[float] = None
        for item in soup.select(".rating-item-content"):
            txt = item.text.lower()
            match = re.search(r"(\d+[.,]\d+)", txt)
            if not match:
                continue
            val = round(float(match.group(1).replace(",", ".")), 1)
            if "presse" in txt:
                press_r = val
            elif "spectateur" in txt or "public" in txt:
                user_r = val
        return {"user_rating": user_r, "press_rating": press_r}

    best_card = None
    target_clean = re.sub(r"[^\w\s]", "", target_title.lower()).strip()

    for card in cards:
        title_el = card.select_one(".meta-title-link")
        if not title_el:
            continue
        card_title = re.sub(r"[^\w\s]", "", title_el.text.lower()).strip()
        if card_title == target_clean or target_clean in card_title or card_title in target_clean:
            best_card = card
            break

    if not best_card:
        best_card = cards[0]

    press_rating: Optional[float] = None
    user_rating: Optional[float] = None

    for rating_holder in best_card.select(".rating-holder, .rating-item-content"):
        txt = rating_holder.text.lower()
        match = re.search(r"(\d+[.,]\d+)", txt)
        if not match:
            continue
        val = round(float(match.group(1).replace(",", ".")), 1)
        if "presse" in txt:
            press_rating = val
        elif "spectateur" in txt or "public" in txt:
            user_rating = val

    return {
        "user_rating": user_rating,
        "press_rating": press_rating,
    }


def extract_movie_titles_from_json_files(data_dir: Path, days_ahead: Optional[int] = 8) -> list[str]:
    """
    Extracts all unique movie titles from showtimes-*.json in data_dir.
    If days_ahead is provided, restricts to showtimes between today and today + days_ahead.
    Falls back to all files if no files match the date filter (e.g. in test fixtures).
    """
    p_dir = Path(data_dir)
    all_files = sorted(list(p_dir.glob("showtimes-*.json")))
    if not all_files:
        return []

    files_to_read = all_files
    if days_ahead is not None and days_ahead > 0:
        today_str = datetime.now().strftime("%Y-%m-%d")
        max_date_str = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        matching = []
        for f in all_files:
            m = re.search(r"(\d{4}-\d{2}-\d{2})", f.name)
            if m:
                d = m.group(1)
                if today_str <= d <= max_date_str:
                    matching.append(f)
            else:
                matching.append(f)
        if matching:
            files_to_read = matching

    titles = set()
    for showtime_file in files_to_read:
        try:
            data = json.loads(showtime_file.read_text(encoding="utf-8"))
            for cid, s_list in data.items():
                for s in s_list:
                    if "title" in s and s["title"]:
                        titles.add(s["title"])
        except Exception as e:
            logger.warning(f"Error reading {showtime_file}: {e}")
    return sorted(list(titles))


class AllocineClient:
    def __init__(self, api: Optional[allocineAPI] = None, session: Optional[requests.Session] = None):
        self.api = api or allocineAPI()
        self.session = session or requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.allocine.fr/",
        })

        # Sécurité : forcer un timeout sur requests si la méthode interne _get_request est appelée
        if hasattr(self.api, "_get_request"):
            orig_get_req = self.api._get_request
            def _safe_get_request(path, params=None):
                req = requests.get(path, params=params, timeout=15)
                if req.status_code != 200:
                    raise Exception("Error " + str(req.status_code))
                return req.text
            self.api._get_request = _safe_get_request

    def _check_rate_limit(self, error: Exception) -> None:
        """Centralise la détection du rate limit HTTP 429 d'Allociné."""
        if "429" in str(error):
            raise AllocineRateLimitError(f"HTTP 429 Too Many Requests : {error}")

    def _fetch_json(self, url: str) -> dict:
        """Exécute une requête GET JSON avec headers navigateur et réutilisation de connexion HTTP."""
        if hasattr(self.api, "_get_json_request") and not isinstance(self.api, allocineAPI):
            # Conserve la compatibilité avec les mocks de tests unitaires
            return self.api._get_json_request(url)

        resp = self.session.get(url, timeout=15)
        if resp.status_code == 429:
            raise AllocineRateLimitError(f"HTTP 429 Too Many Requests pour {url}")
        if resp.status_code != 200:
            raise Exception(f"HTTP {resp.status_code} pour {url}")
        return resp.json()

    def get_daily_showtimes(self, cinema_id: str, date_str: str) -> list[tuple[Movie, list[Showtime]]]:
        """
        Fetch movies and showtimes for a cinema on a specific date.
        Extracts rich format attributes (IMAX, Dolby Cinema, 4DX, ScreenX, 3D, etc.).
        Returns list of (Movie, [Showtime]).
        """
        results: list[tuple[Movie, list[Showtime]]] = []
        if not cinema_id or cinema_id.startswith("IND_"):
            return results

        # 1. Direct rich JSON extraction from Allociné
        try:
            page, total_pages = 0, 1
            raw_elements: list[dict] = []
            while page < total_pages:
                url = URLs.showtime_url(cinema_id, date_str, page + 1)
                json_data = self._fetch_json(url)
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

                    # Ratings (userRating & pressReview from stats)
                    stats = movie_data.get("stats") or {}
                    user_rating_val = None
                    press_rating_val = None
                    user_stat = stats.get("userRating")
                    if isinstance(user_stat, dict) and user_stat.get("score") is not None:
                        try:
                            user_rating_val = round(float(user_stat["score"]), 1)
                        except (ValueError, TypeError):
                            pass

                    press_stat = stats.get("pressReview")
                    if isinstance(press_stat, dict) and press_stat.get("score") is not None:
                        try:
                            press_rating_val = round(float(press_stat["score"]), 1)
                        except (ValueError, TypeError):
                            pass

                    movie = Movie(
                        id=generate_movie_id(title),
                        title=title,
                        original_title=original_title,
                        runtime_minutes=runtime_min,
                        genres=genres,
                        director="",
                        poster_url=poster_url,
                        synopsis=synopsis,
                        user_rating=user_rating_val,
                        press_rating=press_rating_val,
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
            self._check_rate_limit(e)
            if "404" in str(e):
                logger.debug(f"Allociné 404 pour {cinema_id}, cinéma non répertorié.")
                return results
            logger.warning(f"Direct Allociné JSON fetching failed for {cinema_id} ({e}), falling back...")

        # 2. Fallback to standard get_movies + get_showtime methods
        try:
            raw_movies = self.api.get_movies(cinema_id, date_str) or []
            raw_showtimes = self.api.get_showtime(cinema_id, date_str) or []
        except Exception as e:
            self._check_rate_limit(e)
            logger.warning(f"Failed to fetch Allociné showtimes fallback for {cinema_id} on {date_str}: {e}")
            return results

        movies_by_title: dict[str, Movie] = {}
        for m in raw_movies:
            title = m.get("title") or "Titre inconnu"
            runtime_raw = m.get("runtime")
            runtime_min = parse_runtime_to_minutes(runtime_raw)

            stats = m.get("stats") or {}
            user_rating_val = None
            press_rating_val = None
            user_stat = stats.get("userRating")
            if isinstance(user_stat, dict) and user_stat.get("score") is not None:
                try:
                    user_rating_val = round(float(user_stat["score"]), 1)
                except (ValueError, TypeError):
                    pass

            press_stat = stats.get("pressReview")
            if isinstance(press_stat, dict) and press_stat.get("score") is not None:
                try:
                    press_rating_val = round(float(press_stat["score"]), 1)
                except (ValueError, TypeError):
                    pass

            movie = Movie(
                id=generate_movie_id(title),
                title=title,
                original_title=m.get("originalTitle") or "",
                runtime_minutes=runtime_min,
                genres=m.get("genres") or [],
                director=m.get("director") or "",
                poster_url=m.get("urlPoster") or "",
                synopsis=m.get("synopsisFull") or "",
                user_rating=user_rating_val,
                press_rating=press_rating_val,
            )
            movies_by_title[title.lower()] = movie

        for entry in raw_showtimes:
            movie_title = entry.get("title") or "Titre inconnu"
            norm_title = movie_title.lower()

            movie = movies_by_title.get(norm_title)
            if not movie:
                movie = Movie(
                    id=generate_movie_id(movie_title),
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

    def fetch_movie_ratings(self, title: str) -> dict[str, Optional[float]]:
        """
        Fetch Allociné ratings for a specific movie title using Allociné web search.
        Includes HTTP 429 rate limit detection and standard session headers.
        """
        search_url = f"https://www.allocine.fr/rechercher/movie/?q={urllib.parse.quote(title)}"
        try:
            resp = self.session.get(search_url, timeout=15)
            if resp.status_code == 429:
                self._check_rate_limit(Exception("HTTP 429 Too Many Requests"))
            if resp.status_code != 200:
                logger.warning(f"HTTP {resp.status_code} while fetching ratings for '{title}'")
                return {"user_rating": None, "press_rating": None}
            return parse_ratings_from_html(resp.text, title)
        except AllocineRateLimitError:
            raise
        except Exception as e:
            self._check_rate_limit(e)
            logger.warning(f"Error fetching ratings for '{title}': {e}")
            return {"user_rating": None, "press_rating": None}

    def refresh_all_ratings(
        self,
        showtimes_dir: Path,
        output_file: Path,
        ttl_days: int = 7,
        force: bool = False,
        conn: Optional[sqlite3.Connection] = None,
        limit: Optional[int] = None,
        batch_size: Optional[int] = 30,
        loop_batches: bool = True,
        batch_pause: float = 60.0,
        min_delay: float = 0.8,
        max_delay: float = 2.0,
        days_ahead: int = 8,
    ) -> int:
        """
        Refresh ratings for all movies found in showtimes-*.json files or SQLite database.
        Saves updated ratings to output_file (ratings.json) and SQLite if connection provided.
        Respects TTL, uses batches with polite pauses, and protects against Allocine rate limits.
        """
        out_p = Path(output_file)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        existing_cache: dict[str, dict] = {}
        if out_p.exists():
            try:
                existing_cache = json.loads(out_p.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning(f"Unable to read existing ratings file {out_p}: {e}")

        json_titles = set(extract_movie_titles_from_json_files(Path(showtimes_dir), days_ahead=days_ahead))

        movie_repo = None
        if conn:
            from cinepass_planner.db.repositories import MovieRepository
            from cinepass_planner.db.schema import init_db
            init_db(conn)
            movie_repo = MovieRepository(conn)

        if json_titles:
            movie_titles = json_titles
        elif movie_repo:
            movie_titles = {m.title for m in movie_repo.list_all()}
        else:
            movie_titles = set()

        all_sorted_titles = sorted(list(movie_titles))
        now = datetime.now(timezone.utc)

        fresh_titles: set[str] = set()
        stale_titles: list[str] = []

        for title in all_sorted_titles:
            cached_data = existing_cache.get(title)
            is_stale = True

            if cached_data and not force:
                updated_at_str = cached_data.get("updated_at")
                if updated_at_str:
                    try:
                        updated_at = datetime.fromisoformat(updated_at_str)
                        if (now - updated_at).days < ttl_days:
                            is_stale = False
                    except Exception:
                        pass

            if is_stale:
                stale_titles.append(title)
            else:
                fresh_titles.add(title)

        if limit is not None and limit > 0:
            stale_titles = stale_titles[:limit]

        logger.info(
            f"Allocine ratings: {len(movie_titles)} movies in upcoming showtimes. "
            f"{len(fresh_titles)} valid in cache (TTL < {ttl_days}d), {len(stale_titles)} to refresh "
            f"(batch_size={batch_size or 'illimite'}, loop={loop_batches}, pause={batch_pause}s)..."
        )

        if not stale_titles:
            logger.info("All movie ratings are fresh and up to date.")
            self._save_cache_to_disk(existing_cache, out_p)
            return 0

        refreshed_count = 0
        synced_in_batch = 0
        rate_limited = False

        for idx, title in enumerate(stale_titles, start=1):
            if movie_repo and not force:
                db_movie = movie_repo.get_by_title(title)
                if db_movie and (db_movie.user_rating is not None or db_movie.press_rating is not None):
                    existing_cache[title] = {
                        "user_rating": db_movie.user_rating,
                        "press_rating": db_movie.press_rating,
                        "updated_at": now.isoformat(),
                    }
                    refreshed_count += 1
                    logger.info(f"[{idx}/{len(stale_titles)}] '{title}' : deja en base locale ({db_movie.user_rating}/5, {db_movie.press_rating}/5)")
                    continue

            for attempt in range(2):
                try:
                    t0 = time.time()
                    ratings = self.fetch_movie_ratings(title)
                    dur = time.time() - t0

                    existing_cache[title] = {
                        "user_rating": ratings.get("user_rating"),
                        "press_rating": ratings.get("press_rating"),
                        "updated_at": now.isoformat(),
                    }
                    refreshed_count += 1
                    synced_in_batch += 1

                    u_str = f"{ratings.get('user_rating')}/5" if ratings.get('user_rating') is not None else "-"
                    p_str = f"{ratings.get('press_rating')}/5" if ratings.get('press_rating') is not None else "-"
                    logger.info(f"[{idx}/{len(stale_titles)}] '{title}' : Spectateurs {u_str}, Presse {p_str} ({dur:.1f}s)")

                    if movie_repo:
                        movie_repo.update_ratings(
                            title,
                            ratings.get("user_rating"),
                            ratings.get("press_rating"),
                        )

                    # Polite random delay
                    low = min(min_delay, max_delay)
                    high = max(min_delay, max_delay)
                    sleep_time = random.uniform(low, high) if high > 0 else 0
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                    break

                except AllocineRateLimitError as e:
                    if attempt == 0:
                        logger.warning(f"[{idx}/{len(stale_titles)}] Rate limit Allocine (HTTP 429) pour '{title}'. Pause de securite de 30s avant nouvelle tentative...")
                        time.sleep(30)
                    else:
                        logger.warning(f"[{idx}/{len(stale_titles)}] Echec apres nouvelle tentative (HTTP 429) pour '{title}' : {e}")
                        logger.warning("Arret gracieux du rafraichissement pour proteger le quota Allocine. Sauvegarde des donnees acquises.")
                        rate_limited = True
                        break
                except Exception as e:
                    logger.warning(f"[{idx}/{len(stale_titles)}] Erreur lors de la recuperation des notes pour '{title}' : {e}")
                    break

            if rate_limited:
                break

            # Handle batch pause
            if batch_size and synced_in_batch >= batch_size and idx < len(stale_titles):
                self._save_cache_to_disk(existing_cache, out_p)
                if loop_batches:
                    logger.info(f"Lot de {synced_in_batch} films termine ({idx}/{len(stale_titles)} traites). Debut de la pause de securite de {int(batch_pause)}s...")
                    step = 15
                    elapsed = 0.0
                    while elapsed < batch_pause:
                        sleep_duration = min(float(step), batch_pause - elapsed)
                        time.sleep(sleep_duration)
                        elapsed += sleep_duration
                        remaining = int(batch_pause - elapsed)
                        if remaining > 0:
                            logger.info(f"Pause inter-lots en cours : reprise dans {remaining}s...")
                    logger.info("Fin de pause : reprise du rafraichissement des notes.")
                    synced_in_batch = 0
                else:
                    logger.info(f"Lot de {synced_in_batch} films termine. Fin du run actuel.")
                    break

        self._save_cache_to_disk(existing_cache, out_p)
        logger.info(f"Ratings refresh complete: {refreshed_count} movies updated. Saved to {out_p}")
        return refreshed_count

    def _save_cache_to_disk(self, cache: dict[str, dict], out_p: Path) -> None:
        """Atomic write of ratings cache to disk."""
        tmp_file = out_p.with_suffix(".tmp")
        tmp_file.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_file.replace(out_p)


def refresh_all_ratings(
    showtimes_dir: Path,
    output_file: Path,
    ttl_days: int = 7,
    force: bool = False,
    conn: Optional[sqlite3.Connection] = None,
    limit: Optional[int] = None,
    batch_size: Optional[int] = 30,
    loop_batches: bool = True,
    batch_pause: float = 60.0,
    min_delay: float = 0.8,
    max_delay: float = 2.0,
    days_ahead: int = 8,
) -> int:
    """Convenience function delegating to AllocineClient().refresh_all_ratings()."""
    client = AllocineClient()
    return client.refresh_all_ratings(
        showtimes_dir=showtimes_dir,
        output_file=output_file,
        ttl_days=ttl_days,
        force=force,
        conn=conn,
        limit=limit,
        batch_size=batch_size,
        loop_batches=loop_batches,
        batch_pause=batch_pause,
        min_delay=min_delay,
        max_delay=max_delay,
        days_ahead=days_ahead,
    )

