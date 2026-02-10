import sqlite3
from pathlib import Path
from typing import List, Dict

# Project root
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "hoax.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hoaxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        published_at TEXT,
        fetched_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()


def save_articles(articles: List[Dict]) -> int:
    """
    Save articles into database.
    Duplicate URLs are ignored safely.
    Returns number of newly inserted rows.
    """
    if not articles:
        return 0

    conn = get_connection()
    cursor = conn.cursor()

    inserted = 0

    for item in articles:
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO hoaxes
                (source, title, url, published_at, fetched_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                item.get("source"),
                item.get("title"),
                item.get("url"),
                item.get("date"),
                item.get("fetched_at")
            ))

            if cursor.rowcount == 1:
                inserted += 1

        except Exception as e:
            print(f"[DB ERROR] {e}")

    conn.commit()
    conn.close()

    return inserted
