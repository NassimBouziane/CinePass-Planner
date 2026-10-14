import sqlite3

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS cinemas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    address TEXT,
    group_type TEXT DEFAULT 'Les Cinémas Pathé',
    accepts_gold BOOLEAN DEFAULT 1,
    accepts_silver BOOLEAN DEFAULT 1,
    accepts_under26 BOOLEAN DEFAULT 1,
    is_pathe_network BOOLEAN DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_title TEXT,
    runtime_minutes INTEGER NOT NULL,
    genres TEXT,
    director TEXT,
    poster_url TEXT,
    synopsis TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS showtimes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cinema_id TEXT NOT NULL,
    movie_title TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    date_str TEXT NOT NULL,
    version TEXT DEFAULT 'ORIGINAL',
    format TEXT DEFAULT 'Standard',
    screen_name TEXT,
    FOREIGN KEY (cinema_id) REFERENCES cinemas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_showtimes_lookup ON showtimes(cinema_id, date_str, starts_at);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies(title);

CREATE TABLE IF NOT EXISTS sync_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cinema_id TEXT,
    date_str TEXT,
    status TEXT,
    entries_count INTEGER
);
"""

def init_db(conn: sqlite3.Connection) -> None:
    """Initialize database tables and indexes."""
    with conn:
        conn.executescript(SCHEMA_SQL)
