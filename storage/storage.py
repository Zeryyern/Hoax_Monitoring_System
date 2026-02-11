import sqlite3
import hashlib
from pathlib import Path
from typing import List, Dict

# Project root
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "hoax.db"


def get_connection():
    return sqlite3.connect(DB_PATH)

def generate_content_hash(source, title, published_at):
    base = f"{source}|{title.strip().lower()}|{published_at or ''}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()

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
    #Runs tables
    cursor.execute("""CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_time TEXT NOT NULL,
        total_collected INTEGER NOT NULL,
        new_inserted INTEGER NOT NULL,
        status TEXT NOT NULL
    )
    """)
    #source runs table
    cursor.execute(""" 
                   CREATE TABLE IF NOT EXISTS source_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        run_time TEXT NOT NULL,
        status TEXT NOT NULL,
        articles_collected INTEGER NOT NULL)
    """)
    
    conn.commit()
    conn.close()

def log_run(total_collected: int, new_inserted: int, status: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO runs (run_time, total_collected, new_inserted, status)
        VALUES (datetime('now'), ?, ?, ?)
    """, (total_collected, new_inserted, status))

    conn.commit()
    conn.close()

def log_source_run(source_name: str, status: str, count: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO source_runs (source_name, run_time, status, articles_collected)
        VALUES (?, datetime('now'), ?, ?)
    """, (source_name, status, count))

    conn.commit()
    conn.close()


def migrate_add_content_hash():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(hoaxes)")
    columns = [col[1] for col in cursor.fetchall()]

    if "content_hash" not in columns:
        cursor.execute("""
            ALTER TABLE hoaxes
            ADD COLUMN content_hash TEXT
        """)
        conn.commit()
        print("[MIGRATION] content_hash column added")
    else:
        print("[MIGRATION] content_hash already exists")

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
            # Generate stable content identity
            content_hash = generate_content_hash(
                item.get("source"),
                item.get("title"),
                item.get("date")
            )

            cursor.execute("""
                INSERT OR IGNORE INTO hoaxes
                (source, title, url, published_at, fetched_at, content_hash)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                item.get("source"),
                item.get("title"),
                item.get("url"),
                item.get("date"),
                item.get("fetched_at"),
                content_hash
            ))

            if cursor.rowcount == 1:
                inserted += 1

        except Exception as e:
            print(f"[DB ERROR] {e}")

    conn.commit()
    conn.close()

    return inserted
