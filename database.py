import sqlite3
from os.path import join, exists
from config import DB_PATH, DATA_DIR
import os

def ensure_data_dir():
    """Ensure data directory exists"""
    if not exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)


def configure_connection(conn: sqlite3.Connection) -> sqlite3.Connection:
    """Apply production-safe SQLite settings consistently."""
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON")
    except Exception:
        pass
    try:
        conn.execute("PRAGMA busy_timeout = 5000")
    except Exception:
        pass
    try:
        conn.execute("PRAGMA journal_mode = WAL")
    except Exception:
        # Some shared/network filesystems do not support WAL; keep startup resilient.
        pass
    try:
        conn.execute("PRAGMA synchronous = NORMAL")
    except Exception:
        pass
    return conn

def get_connection():
    """Get database connection with row factory"""
    ensure_data_dir()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    return configure_connection(conn)

def init_db():
    """Initialize all database tables"""
    ensure_data_dir()
    conn = get_connection()
    cursor = conn.cursor()

    # ===============================
    # USERS TABLE
    # ===============================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    """)

    # ===============================
    # NEWS TABLE (Enhanced)
    # ===============================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            source TEXT,
            source_url TEXT,
            category TEXT,
            date TEXT,
            published_at_source TEXT,
            prediction TEXT CHECK(prediction IN ('Hoax', 'Legitimate')),
            confidence REAL DEFAULT 0.0 CHECK(confidence >= 0.0 AND confidence <= 1.0),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            claim_key TEXT
        )
    """)

    # ===============================
    # USER ANALYSIS HISTORY
    # ===============================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            news_id INTEGER NOT NULL,
            analysis_type TEXT DEFAULT 'manual',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE
        )
    """)

    # ===============================
    # ADMIN LOGS
    # ===============================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # ===============================
    # PASSWORD RESET TICKETS
    # ===============================
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT,
            ticket_type TEXT DEFAULT 'user' CHECK(ticket_type IN ('user', 'admin')),
            admin_unique_id TEXT,
            status TEXT DEFAULT 'open' CHECK(status IN ('open', 'resolved')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT,
            resolved_by INTEGER,
            resolution_note TEXT,
            FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Add missing columns for existing databases.
    cursor.execute("PRAGMA table_info(news)")
    news_columns = {row[1] for row in cursor.fetchall()}
    if "claim_key" not in news_columns:
        cursor.execute("ALTER TABLE news ADD COLUMN claim_key TEXT")

    cursor.execute("PRAGMA table_info(password_reset_tickets)")
    ticket_columns = {row[1] for row in cursor.fetchall()}
    if "ticket_type" not in ticket_columns:
        cursor.execute(
            "ALTER TABLE password_reset_tickets ADD COLUMN ticket_type TEXT DEFAULT 'user' CHECK(ticket_type IN ('user', 'admin'))"
        )
    if "admin_unique_id" not in ticket_columns:
        cursor.execute(
            "ALTER TABLE password_reset_tickets ADD COLUMN admin_unique_id TEXT"
        )

    # Add missing columns for existing news table.
    cursor.execute("PRAGMA table_info(news)")
    news_columns = {row[1] for row in cursor.fetchall()}
    if "published_at_source" not in news_columns:
        cursor.execute("ALTER TABLE news ADD COLUMN published_at_source TEXT")

    # Create indices for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_date ON news(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_published_at_source ON news(published_at_source)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_prediction ON news(prediction)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_claim_key ON news(claim_key)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_analysis_user ON user_analysis(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_analysis_news ON user_analysis(news_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_status ON password_reset_tickets(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_email ON password_reset_tickets(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_created_at ON password_reset_tickets(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_type ON password_reset_tickets(ticket_type)")

    # ===============================
    # FULL-TEXT SEARCH (Best-Effort)
    # ===============================
    # SQLite builds may or may not include FTS5. This is best-effort and silently
    # degrades to LIKE-based search if unavailable.
    try:
        cursor.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS news_fts USING fts5(
                title,
                claim_key,
                source_url,
                content='news',
                content_rowid='id',
                tokenize='unicode61'
            )
            """
        )
        cursor.execute(
            """
            CREATE TRIGGER IF NOT EXISTS news_ai AFTER INSERT ON news BEGIN
              INSERT INTO news_fts(rowid, title, claim_key, source_url)
              VALUES (new.id, new.title, new.claim_key, new.source_url);
            END;
            """
        )
        cursor.execute(
            """
            CREATE TRIGGER IF NOT EXISTS news_ad AFTER DELETE ON news BEGIN
              INSERT INTO news_fts(news_fts, rowid, title, claim_key, source_url)
              VALUES('delete', old.id, old.title, old.claim_key, old.source_url);
            END;
            """
        )
        cursor.execute(
            """
            CREATE TRIGGER IF NOT EXISTS news_au AFTER UPDATE ON news BEGIN
              INSERT INTO news_fts(news_fts, rowid, title, claim_key, source_url)
              VALUES('delete', old.id, old.title, old.claim_key, old.source_url);
              INSERT INTO news_fts(rowid, title, claim_key, source_url)
              VALUES (new.id, new.title, new.claim_key, new.source_url);
            END;
            """
        )
        # Ensure existing rows are indexed.
        cursor.execute("INSERT INTO news_fts(news_fts) VALUES('rebuild')")
    except Exception:
        pass

    conn.commit()
    conn.close()

def dict_from_row(row):
    """Convert sqlite3.Row to dictionary"""
    if row is None:
        return None
    return dict(row)

def list_from_rows(rows):
    """Convert list of sqlite3.Row to list of dicts"""
    return [dict(row) for row in rows]
