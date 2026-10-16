import json
import sqlite3
from typing import Optional
from cinepass_planner.models import Cinema, Movie, Showtime

class CinemaRepository:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.conn.row_factory = sqlite3.Row

    def save(self, cinema: Cinema) -> None:
        with self.conn:
            self.conn.execute(
                """
                INSERT INTO cinemas (id, name, city, address, group_type, accepts_gold, accepts_silver, accepts_under26, is_pathe_network)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    city=excluded.city,
                    address=excluded.address,
                    group_type=excluded.group_type,
                    accepts_gold=excluded.accepts_gold,
                    accepts_silver=excluded.accepts_silver,
                    accepts_under26=excluded.accepts_under26,
                    is_pathe_network=excluded.is_pathe_network,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    cinema.id,
                    cinema.name,
                    cinema.city,
                    cinema.address,
                    cinema.group_type,
                    cinema.accepts_gold,
                    cinema.accepts_silver,
                    cinema.accepts_under26,
                    cinema.is_pathe_network,
                ),
            )

    def get_by_id(self, cinema_id: str) -> Optional[Cinema]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM cinemas WHERE id = ?", (cinema_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return Cinema(
            id=row["id"],
            name=row["name"],
            city=row["city"] or "",
            address=row["address"] or "",
            group_type=row["group_type"] or "",
            accepts_gold=bool(row["accepts_gold"]),
            accepts_silver=bool(row["accepts_silver"]),
            accepts_under26=bool(row["accepts_under26"]),
            is_pathe_network=bool(row["is_pathe_network"]),
        )

    def list_all(self, city: Optional[str] = None) -> list[Cinema]:
        cursor = self.conn.cursor()
        if city:
            cursor.execute("SELECT * FROM cinemas WHERE LOWER(city) LIKE LOWER(?) ORDER BY name", (f"%{city}%",))
        else:
            cursor.execute("SELECT * FROM cinemas ORDER BY city, name")
        rows = cursor.fetchall()
        return [
            Cinema(
                id=r["id"],
                name=r["name"],
                city=r["city"] or "",
                address=r["address"] or "",
                group_type=r["group_type"] or "",
                accepts_gold=bool(r["accepts_gold"]),
                accepts_silver=bool(r["accepts_silver"]),
                accepts_under26=bool(r["accepts_under26"]),
                is_pathe_network=bool(r["is_pathe_network"]),
            )
            for r in rows
        ]


class MovieRepository:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.conn.row_factory = sqlite3.Row

    def save(self, movie: Movie) -> None:
        genres_json = json.dumps(movie.genres, ensure_ascii=False)
        with self.conn:
            self.conn.execute(
                """
                INSERT INTO movies (id, title, original_title, runtime_minutes, genres, director, poster_url, synopsis, user_rating, press_rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title=excluded.title,
                    original_title=excluded.original_title,
                    runtime_minutes=excluded.runtime_minutes,
                    genres=excluded.genres,
                    director=excluded.director,
                    poster_url=excluded.poster_url,
                    synopsis=excluded.synopsis,
                    user_rating=COALESCE(excluded.user_rating, movies.user_rating),
                    press_rating=COALESCE(excluded.press_rating, movies.press_rating),
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    movie.id,
                    movie.title,
                    movie.original_title,
                    movie.runtime_minutes,
                    genres_json,
                    movie.director,
                    movie.poster_url,
                    movie.synopsis,
                    movie.user_rating,
                    movie.press_rating,
                ),
            )

    def update_ratings(self, title: str, user_rating: Optional[float], press_rating: Optional[float]) -> None:
        with self.conn:
            self.conn.execute(
                """
                UPDATE movies
                SET user_rating = ?, press_rating = ?, updated_at = CURRENT_TIMESTAMP
                WHERE LOWER(title) = LOWER(?)
                """,
                (user_rating, press_rating, title),
            )

    def get_by_title(self, title: str) -> Optional[Movie]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM movies WHERE LOWER(title) = LOWER(?)", (title,))
        row = cursor.fetchone()
        if not row:
            return None
        genres = json.loads(row["genres"]) if row["genres"] else []
        col_names = row.keys()
        user_r = row["user_rating"] if "user_rating" in col_names else None
        press_r = row["press_rating"] if "press_rating" in col_names else None
        return Movie(
            id=row["id"],
            title=row["title"],
            original_title=row["original_title"] or "",
            runtime_minutes=row["runtime_minutes"],
            genres=genres,
            director=row["director"] or "",
            poster_url=row["poster_url"] or "",
            synopsis=row["synopsis"] or "",
            user_rating=user_r,
            press_rating=press_r,
        )

    def list_all(self) -> list[Movie]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT * FROM movies ORDER BY title")
        rows = cursor.fetchall()
        result: list[Movie] = []
        for r in rows:
            col_names = r.keys()
            user_r = r["user_rating"] if "user_rating" in col_names else None
            press_r = r["press_rating"] if "press_rating" in col_names else None
            result.append(
                Movie(
                    id=r["id"],
                    title=r["title"],
                    original_title=r["original_title"] or "",
                    runtime_minutes=r["runtime_minutes"],
                    genres=json.loads(r["genres"]) if r["genres"] else [],
                    director=r["director"] or "",
                    poster_url=r["poster_url"] or "",
                    synopsis=r["synopsis"] or "",
                    user_rating=user_r,
                    press_rating=press_r,
                )
            )
        return result


class ShowtimeRepository:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.conn.row_factory = sqlite3.Row

    def save(self, showtime: Showtime) -> None:
        with self.conn:
            self.conn.execute(
                """
                INSERT INTO showtimes (cinema_id, movie_title, starts_at, ends_at, date_str, version, format, screen_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    showtime.cinema_id,
                    showtime.movie_title,
                    showtime.starts_at,
                    showtime.ends_at,
                    showtime.date_str,
                    showtime.version,
                    showtime.format,
                    showtime.screen_name,
                ),
            )

    def clear_showtimes(self, cinema_id: str, date_str: str) -> None:
        with self.conn:
            self.conn.execute(
                "DELETE FROM showtimes WHERE cinema_id = ? AND date_str = ?",
                (cinema_id, date_str),
            )

    def get_showtimes(self, cinema_id: str | list[str], date_str: str) -> list[Showtime]:
        cursor = self.conn.cursor()
        if isinstance(cinema_id, list):
            if not cinema_id:
                return []
            placeholders = ",".join("?" for _ in cinema_id)
            query = f"""
                SELECT showtimes.*, cinemas.name as cinema_name
                FROM showtimes
                LEFT JOIN cinemas ON showtimes.cinema_id = cinemas.id
                WHERE showtimes.cinema_id IN ({placeholders}) AND showtimes.date_str = ?
                ORDER BY showtimes.starts_at ASC
            """
            params = list(cinema_id) + [date_str]
        else:
            query = """
                SELECT showtimes.*, cinemas.name as cinema_name
                FROM showtimes
                LEFT JOIN cinemas ON showtimes.cinema_id = cinemas.id
                WHERE showtimes.cinema_id = ? AND showtimes.date_str = ?
                ORDER BY showtimes.starts_at ASC
            """
            params = [cinema_id, date_str]

        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [
            Showtime(
                id=r["id"],
                cinema_id=r["cinema_id"],
                cinema_name=r["cinema_name"] or "",
                movie_title=r["movie_title"],
                starts_at=r["starts_at"],
                ends_at=r["ends_at"],
                date_str=r["date_str"],
                version=r["version"] or "ORIGINAL",
                format=r["format"] or "Standard",
                screen_name=r["screen_name"] or "",
            )
            for r in rows
        ]

    def get_cinema_ids_with_format(self, format_keyword: str) -> set[str]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT DISTINCT cinema_id FROM showtimes WHERE LOWER(format) LIKE LOWER(?)",
            (f"%{format_keyword}%",)
        )
        return {r["cinema_id"] for r in cursor.fetchall()}

    def get_distinct_formats(self, cinema_ids: Optional[list[str]] = None) -> list[str]:
        cursor = self.conn.cursor()
        if cinema_ids:
            placeholders = ",".join("?" for _ in cinema_ids)
            cursor.execute(
                f"SELECT DISTINCT format FROM showtimes WHERE cinema_id IN ({placeholders}) ORDER BY format",
                cinema_ids
            )
        else:
            cursor.execute("SELECT DISTINCT format FROM showtimes ORDER BY format")
        return [r["format"] for r in cursor.fetchall() if r["format"]]

