from builtins import str
import sqlite3
import hashlib
from pathlib import Path
from typing import List, Dict
from logger import logger

# Project root
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "hoax.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
    fetched_at TEXT NOT NULL,
    content TEXT,
    content_hash TEXT
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
    #cursor.execute("""
     #   CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_content_hash 
     #   ON hoaxes(content_hash)
    #""")

    # Indexes for faster queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON hoaxes(source)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_published_at ON hoaxes(published_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_content_hash ON hoaxes(content_hash)")
    
    conn.commit()
    conn.close()
    
def migrate_add_content_column():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("PRAGMA table_info(hoaxes)")
    columns = [col[1] for col in cursor.fetchall()]

    if "content" not in columns:
        cursor.execute("""
            ALTER TABLE hoaxes
            ADD COLUMN content TEXT
        """)
        conn.commit()
        logger.info("[MIGRATION] content column added")
       
    else:
        logger.info("[MIGRATION] content column already exists")

    conn.close()

def get_articles_without_content(limit: int = 20):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, url, source
        FROM hoaxes
        WHERE content IS NULL
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    conn.close()
    return rows
def update_article_content(article_id: int, content: str):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE hoaxes
        SET content = ?
        WHERE id = ?
    """, (content, article_id))

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
        logger.info("[MIGRATION] content_hash column added")
        
    else:
        logger.info("[MIGRATION] content_hash column already exists")
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
            source = item.get("source", "").strip()
            title = item.get("title", "").strip()
            date = item.get("date")
            if not source or not title:
                logger.warning("Skipped article with missing source/title")
                continue
            content_hash = generate_content_hash(source, title, date)


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
            logger.error(f"Database inser Error: {str(e)}")

    conn.commit()
    conn.close()

    return inserted

#adding simple query functions for analysis purposes
def get_total_articles():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM hoaxes")
    total = cursor.fetchone()[0]

    conn.close()
    return total


def get_articles_per_source():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT source, COUNT(*) 
        FROM hoaxes 
        GROUP BY source
        ORDER BY COUNT(*) DESC
    """)

    results = cursor.fetchall()
    conn.close()
    return results


def get_recent_runs(limit: int = 5):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT run_time, total_collected, new_inserted, status
        FROM runs
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))

    results = cursor.fetchall()
    conn.close()
    return results
