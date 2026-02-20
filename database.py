import sqlite3
from os.path import join, exists
from config import DB_PATH, DATA_DIR
import os

def ensure_data_dir():
    """Ensure data directory exists"""
    if not exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

def get_connection():
    """Get database connection with row factory"""
    ensure_data_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

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
            prediction TEXT CHECK(prediction IN ('Hoax', 'Legitimate')),
            confidence REAL DEFAULT 0.0 CHECK(confidence >= 0.0 AND confidence <= 1.0),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

    # Create indices for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_date ON news(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_news_prediction ON news(prediction)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_analysis_user ON user_analysis(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_analysis_news ON user_analysis(news_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_status ON password_reset_tickets(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_email ON password_reset_tickets(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_created_at ON password_reset_tickets(created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tickets_type ON password_reset_tickets(ticket_type)")

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
