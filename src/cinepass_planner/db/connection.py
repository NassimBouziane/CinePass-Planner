import sqlite3
from pathlib import Path
from typing import Optional
from cinepass_planner.config import DEFAULT_DB_PATH

def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Return a configured sqlite3 connection with WAL mode and foreign keys enabled."""
    target_path = db_path if db_path is not None else DEFAULT_DB_PATH
    if isinstance(target_path, Path):
        target_path.parent.mkdir(parents=True, exist_ok=True)
        path_str = str(target_path)
    else:
        path_str = target_path

    conn = sqlite3.connect(path_str)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn
