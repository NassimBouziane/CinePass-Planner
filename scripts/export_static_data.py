import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Union

# Add src to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "src"))

from cinepass_planner.config import DEFAULT_DB_PATH
from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.db.repositories import CinemaRepository

def export_static_data(conn: sqlite3.Connection, output_dir: Union[str, Path]) -> dict:
    """
    Export SQLite cinema and showtime data into compact static JSON files for Astro frontend.
    Generates:
      - cinemas.json
      - dates.json
      - showtimes-<date>.json
    """
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    cin_repo = CinemaRepository(conn)
    all_cinemas = cin_repo.list_all()

    # 1. Fetch available formats per cinema from showtimes
    cursor = conn.cursor()
    cursor.execute("""
        SELECT cinema_id, format, COUNT(*) as count
        FROM showtimes
        WHERE format IS NOT NULL AND format != ''
        GROUP BY cinema_id, format
    """)
    cinema_formats: dict[str, set[str]] = {}
    for row in cursor.fetchall():
        cid = row["cinema_id"]
        fmt = row["format"]
        if cid not in cinema_formats:
            cinema_formats[cid] = set()
        cinema_formats[cid].add(fmt)

    # 2. Write cinemas.json
    cinemas_payload = []
    for c in all_cinemas:
        formats = sorted(list(cinema_formats.get(c.id, {"Standard"})))
        cinemas_payload.append({
            "id": c.id,
            "name": c.name,
            "city": c.city,
            "address": c.address or "",
            "group_type": c.group_type,
            "accepts_gold": bool(c.accepts_gold),
            "accepts_silver": bool(c.accepts_silver),
            "accepts_under26": bool(c.accepts_under26),
            "is_pathe_network": bool(c.is_pathe_network),
            "formats": formats
        })

    (out / "cinemas.json").write_text(
        json.dumps(cinemas_payload, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # 3. Write dates.json
    cursor.execute("""
        SELECT DISTINCT date_str
        FROM showtimes
        ORDER BY date_str ASC
    """)
    dates = [row["date_str"] for row in cursor.fetchall()]

    (out / "dates.json").write_text(
        json.dumps(dates, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    # 4. Write showtimes-<date>.json
    dates_exported = 0
    total_showtimes = 0

    for d in dates:
        cursor.execute("""
            SELECT showtimes.cinema_id, showtimes.movie_title, showtimes.starts_at, showtimes.ends_at,
                   showtimes.version, showtimes.format, movies.poster_url
            FROM showtimes
            LEFT JOIN movies ON showtimes.movie_title = movies.title
            WHERE showtimes.date_str = ?
            ORDER BY showtimes.starts_at ASC
        """, (d,))
        rows = cursor.fetchall()

        by_cinema: dict[str, list[dict]] = {}
        for r in rows:
            cid = r["cinema_id"]
            if cid not in by_cinema:
                by_cinema[cid] = []
            by_cinema[cid].append({
                "title": r["movie_title"],
                "starts_at": r["starts_at"],
                "ends_at": r["ends_at"],
                "version": r["version"] or "ORIGINAL",
                "format": r["format"] or "Standard",
                "poster_url": r["poster_url"] or ""
            })
            total_showtimes += 1

        (out / f"showtimes-{d}.json").write_text(
            json.dumps(by_cinema, ensure_ascii=False, separators=(',', ':')),
            encoding="utf-8"
        )
        dates_exported += 1

    return {
        "cinemas_count": len(cinemas_payload),
        "dates_count": len(dates),
        "showtimes_count": total_showtimes
    }

def main():
    parser = argparse.ArgumentParser(description="Export CinéPass database to static JSON files for Astro web app")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Path to SQLite database")
    parser.add_argument("--output", "-o", type=Path, default=BASE_DIR / "web" / "public" / "data", help="Output directory")
    args = parser.parse_args()

    print(f"📦 Exporting static data from {args.db} to {args.output}...")
    conn = get_db_connection(args.db)
    stats = export_static_data(conn, args.output)
    print(f"✅ Export completed: {stats['cinemas_count']} cinemas, {stats['dates_count']} dates, {stats['showtimes_count']} showtimes.")

if __name__ == "__main__":
    main()
