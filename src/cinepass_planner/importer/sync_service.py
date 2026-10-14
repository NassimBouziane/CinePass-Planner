import sqlite3
from datetime import date, timedelta
from typing import Optional
from cinepass_planner.importer.allocine_client import AllocineClient
from cinepass_planner.db.repositories import MovieRepository, ShowtimeRepository

class SyncService:
    def __init__(self, conn: sqlite3.Connection, client: Optional[AllocineClient] = None):
        self.conn = conn
        self.client = client or AllocineClient()
        self.movie_repo = MovieRepository(conn)
        self.showtime_repo = ShowtimeRepository(conn)

    def is_cinema_fresh(self, cinema_id: str, for_date: date) -> bool:
        """
        Check if showtimes for this cinema and date have been synchronized.
        """
        date_str = for_date.strftime("%Y-%m-%d")
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) as count FROM sync_history
            WHERE cinema_id = ? AND date_str = ? AND status = 'SUCCESS'
            """,
            (cinema_id, date_str),
        )
        row = cursor.fetchone()
        return bool(row and row["count"] > 0)

    def sync_cinema(self, cinema_id: str, start_date: Optional[date] = None, days_count: int = 7, force: bool = False) -> int:
        """
        Synchronize a cinema's showtimes for days_count starting from start_date (default: today).
        If force is False, skips dates that are already fresh in the local SQLite database (0 API call).
        Returns total number of showtimes saved.
        """
        current_date = start_date or date.today()
        total_showtimes_saved = 0

        for i in range(days_count):
            target_date = current_date + timedelta(days=i)
            date_str = target_date.strftime("%Y-%m-%d")

            # If already fresh in SQLite and not forced, SKIP API call!
            if not force and self.is_cinema_fresh(cinema_id, target_date):
                continue

            daily_data = self.client.get_daily_showtimes(cinema_id, date_str)

            # Clear existing showtimes for this cinema and date to avoid duplicates
            self.showtime_repo.clear_showtimes(cinema_id, date_str)

            count_for_day = 0
            for movie, showtimes in daily_data:
                self.movie_repo.save(movie)
                for st in showtimes:
                    self.showtime_repo.save(st)
                    count_for_day += 1

            total_showtimes_saved += count_for_day

            # Record in sync history
            with self.conn:
                self.conn.execute(
                    """
                    INSERT INTO sync_history (cinema_id, date_str, status, entries_count)
                    VALUES (?, ?, 'SUCCESS', ?)
                    """,
                    (cinema_id, date_str, count_for_day),
                )

        return total_showtimes_saved
