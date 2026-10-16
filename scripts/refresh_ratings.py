import argparse
import logging
from datetime import datetime
from pathlib import Path
import sys
import time

# Add src to sys.path so the script works without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cinepass_planner.config import DEFAULT_DB_PATH
from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.importer.allocine_client import AllocineClient


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
    logger = logging.getLogger("refresh_ratings")

    base_dir = Path(__file__).resolve().parent.parent
    default_showtimes_dir = base_dir / "web" / "public" / "data"
    default_output_file = default_showtimes_dir / "ratings.json"

    parser = argparse.ArgumentParser(
        description="Refresh Allociné ratings for movies found in showtime data and database."
    )
    parser.add_argument(
        "--showtimes-dir",
        type=Path,
        default=default_showtimes_dir,
        help="Directory containing showtimes-*.json files (default: web/public/data)",
    )
    parser.add_argument(
        "--output-file",
        type=Path,
        default=default_output_file,
        help="Path to output ratings.json file (default: web/public/data/ratings.json)",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Optional path to SQLite database to read/write ratings",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        default=False,
        help="Force refresh all movies regardless of TTL cache",
    )
    parser.add_argument(
        "--ttl-days",
        type=int,
        default=7,
        help="Cache TTL in days (default: 7)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=30,
        help="Number of movies to refresh per batch (default: 30)",
    )
    parser.add_argument(
        "--batch-pause",
        type=float,
        default=60.0,
        help="Pause in seconds between batches (default: 60s)",
    )
    parser.add_argument(
        "--loop-batches",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Chain all batches with pauses until completion (default: True)",
    )
    parser.add_argument(
        "--min-delay",
        type=float,
        default=0.8,
        help="Minimum random delay in seconds between movie requests (default: 0.8)",
    )
    parser.add_argument(
        "--max-delay",
        type=float,
        default=2.0,
        help="Maximum random delay in seconds between movie requests (default: 2.0)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of movies to refresh (ideal for testing)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=8,
        help="Number of days ahead to scan for upcoming showtimes (default: 8)",
    )

    args = parser.parse_args()

    start_time = datetime.now()
    logger.info(f"Starting Allociné ratings refresh at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Showtimes directory: {args.showtimes_dir}")
    logger.info(f"Output file: {args.output_file}")
    logger.info(f"TTL days: {args.ttl_days} (force: {args.force})")
    logger.info(f"Batching: size={args.batch_size}, pause={args.batch_pause}s, loop={args.loop_batches}")
    logger.info(f"Delays: min={args.min_delay}s, max={args.max_delay}s | Days ahead: {args.days}")

    conn = None
    if args.db and args.db.exists():
        try:
            conn = get_db_connection(args.db)
            from cinepass_planner.db.schema import init_db
            init_db(conn)
        except Exception as e:
            logger.warning(f"Could not open database at {args.db}: {e}")

    client = AllocineClient()
    t0 = time.time()
    refreshed_count = client.refresh_all_ratings(
        showtimes_dir=args.showtimes_dir,
        output_file=args.output_file,
        ttl_days=args.ttl_days,
        force=args.force,
        conn=conn,
        limit=args.limit,
        batch_size=args.batch_size,
        loop_batches=args.loop_batches,
        batch_pause=args.batch_pause,
        min_delay=args.min_delay,
        max_delay=args.max_delay,
        days_ahead=args.days,
    )
    elapsed = time.time() - t0

    logger.info(f"Refresh completed in {elapsed:.1f}s")
    logger.info(f"Movies refreshed: {refreshed_count}")
    logger.info(f"Ratings saved to: {args.output_file}")


if __name__ == "__main__":
    main()
