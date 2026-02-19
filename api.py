from flask import Flask, jsonify, request
from flask_cors import CORS
from analysis.classifier import classify_article
from database import get_connection, init_db, dict_from_row, list_from_rows
from threading import Thread, Event, Lock
import time
from auth import (
    token_required, admin_required, 
    authenticate_user, create_user, get_user_by_id,
    create_token, log_admin_action as record_admin_action, hash_password, verify_password
)
from datetime import datetime, timedelta
from config import CORS_ORIGINS, API_ENV, API_HOST, API_PORT, DEBUG
import json
import traceback
from typing import Optional

SCRAPER_IMPORT_ERROR = None
STORAGE_IMPORT_ERROR = None

try:
    from scraper.fetch import safe_run, normalize_and_filter
    from scraper.sources.turnbackhoax import scrape_turnbackhoax
    from scraper.sources.antaranews import scrape_antaranews
    from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
    from scraper.sources.detik_hoax import scrape_detik_hoax
    from scraper.sources.tempo_hoax import scrape_tempo_hoax
except Exception as e:
    SCRAPER_IMPORT_ERROR = str(e)
    safe_run = None
    normalize_and_filter = None
    scrape_turnbackhoax = None
    scrape_antaranews = None
    scrape_kompas_cekfakta = None
    scrape_detik_hoax = None
    scrape_tempo_hoax = None

try:
    from storage.storage import (
        init_db as init_scraper_db,
        migrate_add_content_column,
        migrate_add_content_hash,
        migrate_add_nlp_columns,
        migrate_add_category_column,
        save_articles,
        log_run as log_scraper_run,
        get_connection as get_scraper_connection,
    )
except Exception as e:
    STORAGE_IMPORT_ERROR = str(e)
    init_scraper_db = None
    migrate_add_content_column = None
    migrate_add_content_hash = None
    migrate_add_nlp_columns = None
    migrate_add_category_column = None
    save_articles = None
    log_scraper_run = None
    get_scraper_connection = None

app = Flask(__name__)

# Parse CORS origins
if API_ENV.lower() == "development" or str(CORS_ORIGINS).strip() == "*":
    origins = "*"
else:
    try:
        origins = json.loads(CORS_ORIGINS)
    except Exception:
        origins = [origin.strip() for origin in str(CORS_ORIGINS).split(",") if origin.strip()]
        if not origins:
            origins = "*"

CORS(app, resources={r"/api/*": {"origins": origins}})

# Initialize database on startup
init_db()

# Seed initial data
try:
    from seed_data import seed_database, seed_admin_user, seed_test_users
    seed_database()
    seed_admin_user()
    seed_test_users()
except Exception as e:
    print(f"Warning: Could not seed data: {e}")

# ===============================
# UTILITY FUNCTIONS
# ===============================

def success_response(data=None, message="Success", status_code=200):
    """Format success response"""
    return jsonify({
        "status": "success",
        "message": message,
        "data": data
    }), status_code

def error_response(message="Error", status_code=400, details=None):
    """Format error response"""
    return jsonify({
        "status": "error",
        "message": message,
        "details": details
    }), status_code

# ===============================
# SCRAPING CONTROL
# ===============================

ALL_SCRAPER_SOURCES = {
    "turnbackhoax": "TurnBackHoax",
    "antaranews": "Antara Anti-Hoax",
    "kompas_cekfakta": "Kompas Cek Fakta",
    "detik_hoax": "Detik Hoax or Not",
    "tempo_hoax": "Tempo Hoax",
}

SCRAPER_SOURCES = {
    "turnbackhoax": ("TurnBackHoax", scrape_turnbackhoax),
    "antaranews": ("Antara Anti-Hoax", scrape_antaranews),
    "kompas_cekfakta": ("Kompas Cek Fakta", scrape_kompas_cekfakta),
    "detik_hoax": ("Detik Hoax or Not", scrape_detik_hoax),
    "tempo_hoax": ("Tempo Hoax", scrape_tempo_hoax),
}

SCRAPER_SOURCES = {key: value for key, value in SCRAPER_SOURCES.items() if value[1] is not None}


def _to_news_date(published_at: Optional[str]) -> str:
    if not published_at:
        return datetime.now().strftime("%Y-%m-%d")
    try:
        value = published_at.replace("Z", "+00:00")
        return datetime.fromisoformat(value).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def _persist_scraped_to_news(items: list[dict]) -> int:
    """Store scraped items in API news table so admin UI stays in sync."""
    if not items:
        return 0

    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0

    try:
        for item in items:
            title = (item.get("title") or "").strip()
            source = (item.get("source") or "Scraper").strip()
            source_url = (item.get("url") or "").strip()

            if not title:
                continue

            if source_url:
                cursor.execute("SELECT id FROM news WHERE source_url = ? LIMIT 1", (source_url,))
                if cursor.fetchone():
                    continue

            prediction, confidence = classify_article(title)
            cursor.execute(
                """
                INSERT INTO news (title, content, source, source_url, category, date, prediction, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    None,
                    source,
                    source_url or None,
                    "Scraped",
                    _to_news_date(item.get("published_at")),
                    prediction,
                    confidence,
                ),
            )
            inserted += 1

        conn.commit()
    finally:
        conn.close()

    return inserted


class ScrapingManager:
    def __init__(self):
        self.interval_seconds = 300
        self.started_at = None
        self.last_run_at = None
        self.lock = Lock()
        self.last_summary = {}
        self.source_workers = {}
        for source_key in ALL_SCRAPER_SOURCES:
            self.source_workers[source_key] = {
                "is_running": False,
                "interval_seconds": 300,
                "started_at": None,
                "last_run_at": None,
                "thread": None,
                "stop_event": Event(),
            }

    def _ensure_dependencies(self):
        errors = []
        if SCRAPER_IMPORT_ERROR:
            errors.append(f"scraper import error: {SCRAPER_IMPORT_ERROR}")
        if STORAGE_IMPORT_ERROR:
            errors.append(f"storage import error: {STORAGE_IMPORT_ERROR}")
        if errors:
            raise RuntimeError("; ".join(errors))
        if not SCRAPER_SOURCES:
            raise RuntimeError("No scraper sources are available")

    def _prepare_storage(self):
        self._ensure_dependencies()
        init_scraper_db()
        migrate_add_content_column()
        migrate_add_content_hash()
        migrate_add_nlp_columns()
        migrate_add_category_column()

    def run_source_once(self, source_key: str) -> dict:
        if source_key not in ALL_SCRAPER_SOURCES:
            raise ValueError("Unknown source key")
        if source_key not in SCRAPER_SOURCES:
            raise RuntimeError(f"Source {source_key} unavailable: scraper dependencies not loaded")

        self._ensure_dependencies()
        source_name, scraper_func = SCRAPER_SOURCES[source_key]
        self._prepare_storage()

        raw = safe_run(scraper_func, source_name)
        cleaned = normalize_and_filter(raw, source_name)
        inserted_scraper = save_articles(cleaned)
        inserted_news = _persist_scraped_to_news(cleaned)

        self.last_run_at = datetime.utcnow().isoformat()
        result = {
            "source_key": source_key,
            "source_name": source_name,
            "collected": len(cleaned),
            "inserted_scraper_db": inserted_scraper,
            "inserted_news_db": inserted_news,
            "run_time": self.last_run_at,
        }
        self.last_summary = result
        return result

    def _run_source_loop(self, source_key: str):
        worker = self.source_workers[source_key]
        stop_event = worker["stop_event"]

        while not stop_event.is_set():
            try:
                result = self.run_source_once(source_key)
                worker["last_run_at"] = result["run_time"]
            except Exception:
                pass
            stop_event.wait(worker["interval_seconds"])

        worker["is_running"] = False

    def run_all_once(self) -> dict:
        self._ensure_dependencies()
        self._prepare_storage()
        total_collected = 0
        total_inserted_scraper = 0
        total_inserted_news = 0
        per_source = []

        for source_key in SCRAPER_SOURCES:
            result = self.run_source_once(source_key)
            total_collected += result["collected"]
            total_inserted_scraper += result["inserted_scraper_db"]
            total_inserted_news += result["inserted_news_db"]
            per_source.append(result)

        log_scraper_run(total_collected, total_inserted_scraper, "SUCCESS")
        summary = {
            "total_collected": total_collected,
            "total_inserted_scraper_db": total_inserted_scraper,
            "total_inserted_news_db": total_inserted_news,
            "sources": per_source,
            "run_time": datetime.utcnow().isoformat(),
        }
        self.last_run_at = summary["run_time"]
        self.last_summary = summary
        return summary

    def start(self, interval_seconds: int = 300):
        """Start all sources continuously"""
        with self.lock:
            self.interval_seconds = max(30, int(interval_seconds or 300))
            self.started_at = datetime.utcnow().isoformat()
            started_any = False
            for source_key in ALL_SCRAPER_SOURCES:
                if self.start_source(source_key, self.interval_seconds):
                    started_any = True
            return started_any

    def stop(self):
        """Stop all running source loops"""
        with self.lock:
            for source_key in ALL_SCRAPER_SOURCES:
                self.stop_source(source_key)

    def start_source(self, source_key: str, interval_seconds: int = 300):
        if source_key not in ALL_SCRAPER_SOURCES:
            raise ValueError("Unknown source key")
        if source_key not in SCRAPER_SOURCES:
            raise RuntimeError(f"Source {source_key} unavailable: scraper dependencies not loaded")
        self._ensure_dependencies()

        worker = self.source_workers[source_key]
        if worker["is_running"]:
            return False

        worker["interval_seconds"] = max(30, int(interval_seconds or 300))
        worker["started_at"] = datetime.utcnow().isoformat()
        worker["stop_event"] = Event()
        worker["is_running"] = True

        thread = Thread(target=self._run_source_loop, args=(source_key,), daemon=True)
        worker["thread"] = thread
        thread.start()
        return True

    def stop_source(self, source_key: str):
        if source_key not in self.source_workers:
            raise ValueError("Unknown source key")
        worker = self.source_workers[source_key]
        if not worker["is_running"]:
            return False
        worker["stop_event"].set()
        worker["is_running"] = False
        return True

    def source_metrics(self):
        metrics = []

        db_rows = {}
        try:
            self._prepare_storage()
            conn = get_scraper_connection()
            cursor = conn.cursor()
            try:
                for source_key, (source_name, _) in SCRAPER_SOURCES.items():
                    cursor.execute(
                        """
                        SELECT run_time, status, articles_collected
                        FROM source_runs
                        WHERE source_name = ?
                        ORDER BY id DESC
                        LIMIT 1
                        """,
                        (source_name,),
                    )
                    row = cursor.fetchone()
                    db_rows[source_key] = row
            finally:
                conn.close()
        except Exception:
            db_rows = {}

        for source_key, source_name in ALL_SCRAPER_SOURCES.items():
            worker = self.source_workers.get(source_key, {})
            row = db_rows.get(source_key)
            available = source_key in SCRAPER_SOURCES
            metrics.append(
                {
                    "source_key": source_key,
                    "source_name": source_name,
                    "available": available,
                    "is_running": worker.get("is_running", False),
                    "interval_seconds": worker.get("interval_seconds", 300),
                    "started_at": worker.get("started_at"),
                    "loop_last_run_at": worker.get("last_run_at"),
                    "last_run_time": row["run_time"] if row else None,
                    "last_status": row["status"] if row else ("UNAVAILABLE" if not available else "N/A"),
                    "last_collected": row["articles_collected"] if row else 0,
                }
            )

        return metrics

    def status(self):
        sources = self.source_metrics()
        running = any(source.get("is_running") for source in sources)
        return {
            "is_running": running,
            "interval_seconds": self.interval_seconds,
            "started_at": self.started_at,
            "last_run_at": self.last_run_at,
            "last_summary": self.last_summary,
            "import_error": SCRAPER_IMPORT_ERROR or STORAGE_IMPORT_ERROR,
            "sources": sources,
        }


scraping_manager = ScrapingManager()

# ===============================
# HEALTH/INFO ROUTES
# ===============================

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return success_response({"status": "healthy"}, "API is running")

@app.route("/api/info", methods=["GET"])
def api_info():
    """API info endpoint"""
    return success_response({
        "name": "Hoax Monitoring System API",
        "version": "1.0.0",
        "endpoints": {
            "auth": ["/api/auth/register", "/api/auth/login"],
            "news": ["/api/news", "/api/news/<id>"],
            "analyze": ["/api/analyze"],
            "admin": ["/api/admin/dashboard", "/api/admin/users"],
            "user": ["/api/user/profile", "/api/user/analysis"]
        }
    })

# ===============================
# AUTHENTICATION ROUTES
# ===============================

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register new user"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response("No data provided", 400)
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not all([username, email, password]):
            return error_response("Missing required fields: username, email, password", 400)
        
        if len(username) < 3:
            return error_response("Username must be at least 3 characters", 400)
        
        if '@' not in email:
            return error_response("Invalid email format", 400)
        
        if len(password) < 8:
            return error_response("Password must be at least 8 characters", 400)
        
        success, user, error_msg = create_user(username, email, password, role='user')
        
        if not success:
            return error_response(error_msg, 400)
        
        return success_response(user, "Registration successful", 201)
        
    except Exception as e:
        return error_response(f"Registration failed: {str(e)}", 500, traceback.format_exc())

@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data:
            return error_response("No data provided", 400)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return error_response("Email and password required", 400)
        
        success, token, user, error_msg = authenticate_user(email, password)
        
        if not success:
            return error_response(error_msg, 401)
        
        return success_response({
            "token": token,
            "user": user
        }, "Login successful")
        
    except Exception as e:
        return error_response(f"Login failed: {str(e)}", 500, traceback.format_exc())

@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_current_user():
    """Get current user profile"""
    try:
        user = get_user_by_id(request.current_user['user_id'])
        if not user:
            return error_response("User not found", 404)
        return success_response(user)
    except Exception as e:
        return error_response(str(e), 500)

# ===============================
# NEWS ANALYSIS ROUTES
# ===============================

@app.route("/api/analyze", methods=["POST"])
@token_required
def analyze_text():
    """Analyze text for hoax detection"""
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return error_response("Text is required for analysis", 400)
        
        text = data.get("text", "").strip()
        
        if len(text) < 20:
            return error_response("Text must be at least 20 characters", 400)
        
        # Run classifier
        prediction, confidence = classify_article(text)
        
        # Prepare data
        new_item = {
            "title": text[:100],  # First 100 chars as title
            "content": text,
            "source": data.get("source", "User Input"),
            "category": data.get("category", "General"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "prediction": prediction,
            "confidence": confidence
        }
        
        # Save to database
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO news (title, content, source, category, date, prediction, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                new_item["title"],
                new_item["content"],
                new_item["source"],
                new_item["category"],
                new_item["date"],
                new_item["prediction"],
                new_item["confidence"]
            ))
            
            conn.commit()
            news_id = cursor.lastrowid
            new_item["id"] = news_id
            
            # Log user analysis
            cursor.execute("""
                INSERT INTO user_analysis (user_id, news_id, analysis_type)
                VALUES (?, ?, 'manual')
            """, (request.current_user['user_id'], news_id))
            conn.commit()
            
        finally:
            conn.close()
        
        return success_response(new_item, "Analysis completed", 201)
        
    except Exception as e:
        return error_response(f"Analysis failed: {str(e)}", 500, traceback.format_exc())

# ===============================
# NEWS MANAGEMENT ROUTES
# ===============================

@app.route("/api/news/recent", methods=["GET"])
def get_recent_hoaxes():
    """Get recent hoax articles for homepage"""
    try:
        limit = min(100, int(request.args.get('limit', 10)))
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, source, category, date, prediction, confidence 
            FROM news 
            ORDER BY date DESC 
            LIMIT ?
        """, (limit,))
        
        hoaxes = list_from_rows(cursor.fetchall())
        conn.close()
        
        return success_response(hoaxes)
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/news", methods=["GET"])
def get_news():
    """Get all news with pagination and filtering"""
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, int(request.args.get('limit', 20)))
        
        offset = (page - 1) * limit
        
        # Filters
        category = request.args.get('category')
        prediction = request.args.get('prediction')
        search = request.args.get('search', '').strip()
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Build query
        query = "SELECT id, title, source, category, date, prediction, confidence FROM news WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if prediction:
            query += " AND prediction = ?"
            params.append(prediction)
        
        if search:
            query += " AND (title LIKE ? OR content LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term])
        
        # Count total
        count_query = query.replace("SELECT id, title, source, category, date, prediction, confidence", "SELECT COUNT(*) as count")
        cursor.execute(count_query, params)
        total = cursor.fetchone()['count']
        
        # Get paginated results
        query += " ORDER BY date DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        news_list = list_from_rows(cursor.fetchall())
        conn.close()
        
        return success_response({
            "items": news_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/news/<int:news_id>", methods=["GET"])
def get_news_detail(news_id):
    """Get single news article"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM news WHERE id = ?", (news_id,))
        news = dict_from_row(cursor.fetchone())
        conn.close()
        
        if not news:
            return error_response("News not found", 404)
        
        return success_response(news)
        
    except Exception as e:
        return error_response(str(e), 500)

# ===============================
# ADMIN ROUTES
# ===============================

@app.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    """Get admin dashboard statistics"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get stats
        cursor.execute("SELECT COUNT(*) as count FROM news")
        total_news = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM news WHERE prediction = 'Hoax'")
        hoax_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM news WHERE prediction = 'Legitimate'")
        legit_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'user'")
        user_count = cursor.fetchone()['count']
        
        cursor.execute("SELECT AVG(confidence) as avg_confidence FROM news")
        avg_confidence = cursor.fetchone()['avg_confidence'] or 0
        
        # Get recent news
        cursor.execute("""
            SELECT id, title, prediction, confidence, date 
            FROM news 
            ORDER BY date DESC 
            LIMIT 10
        """)
        recent = list_from_rows(cursor.fetchall())
        
        # Category distribution
        cursor.execute("""
            SELECT category, COUNT(*) as count, AVG(confidence) as avg_conf
            FROM news
            GROUP BY category
            ORDER BY count DESC
        """)
        categories = list_from_rows(cursor.fetchall())
        
        conn.close()
        
        return success_response({
            "statistics": {
                "total_news": total_news,
                "hoax_count": hoax_count,
                "legitimate_count": legit_count,
                "user_count": user_count,
                "avg_confidence": round(avg_confidence, 3),
                "hoax_percentage": round((hoax_count / max(1, total_news)) * 100, 2)
            },
            "recent_news": recent,
            "category_distribution": categories
        })
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/status", methods=["GET"])
@admin_required
def admin_scraping_status():
    """Get scraping process status and source metrics"""
    try:
        return success_response(scraping_manager.status())
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/sources", methods=["GET"])
@admin_required
def admin_scraping_sources():
    """Get available scraper sources and latest stats"""
    try:
        return success_response(scraping_manager.source_metrics())
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/start", methods=["POST"])
@admin_required
def admin_start_scraping():
    """Start continuous scraping loop"""
    try:
        data = request.get_json() or {}
        interval_seconds = int(data.get("interval_seconds", 300))
        started = scraping_manager.start(interval_seconds)
        if not started:
            return error_response("No available sources started (already running or unavailable)", 400)

        record_admin_action(
            request.current_user['user_id'],
            "START_SCRAPING",
            f"Started scraping loop with interval {scraping_manager.interval_seconds}s",
        )
        return success_response(scraping_manager.status(), "Scraping started")
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/stop", methods=["POST"])
@admin_required
def admin_stop_scraping():
    """Stop continuous scraping loop"""
    try:
        scraping_manager.stop()
        record_admin_action(
            request.current_user['user_id'],
            "STOP_SCRAPING",
            "Stopped scraping loop",
        )
        return success_response(scraping_manager.status(), "Scraping stopped")
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/run-all", methods=["POST"])
@admin_required
def admin_run_all_scrapers():
    """Run all scrapers once"""
    try:
        summary = scraping_manager.run_all_once()
        record_admin_action(
            request.current_user['user_id'],
            "RUN_ALL_SCRAPERS",
            f"Collected {summary['total_collected']} articles",
        )
        return success_response(summary, "All scrapers executed")
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/run-source/<string:source_key>", methods=["POST"])
@admin_required
def admin_run_single_scraper(source_key):
    """Run one scraper source once"""
    try:
        result = scraping_manager.run_source_once(source_key)
        record_admin_action(
            request.current_user['user_id'],
            "RUN_SOURCE_SCRAPER",
            f"Source {result['source_name']} collected {result['collected']}",
        )
        return success_response(result, "Source scraper executed")
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/start-source/<string:source_key>", methods=["POST"])
@admin_required
def admin_start_single_source_loop(source_key):
    """Start continuous scraping for one source"""
    try:
        data = request.get_json() or {}
        interval_seconds = int(data.get("interval_seconds", 300))
        started = scraping_manager.start_source(source_key, interval_seconds)
        if not started:
            return error_response("Source scraper is already running", 400)

        record_admin_action(
            request.current_user['user_id'],
            "START_SOURCE_SCRAPER_LOOP",
            f"Started source {source_key} loop interval {interval_seconds}s",
        )
        return success_response(scraping_manager.status(), "Source scraper started")
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/scraping/stop-source/<string:source_key>", methods=["POST"])
@admin_required
def admin_stop_single_source_loop(source_key):
    """Stop continuous scraping for one source"""
    try:
        stopped = scraping_manager.stop_source(source_key)
        if not stopped:
            return error_response("Source scraper is not running", 400)

        record_admin_action(
            request.current_user['user_id'],
            "STOP_SOURCE_SCRAPER_LOOP",
            f"Stopped source {source_key} loop",
        )
        return success_response(scraping_manager.status(), "Source scraper stopped")
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_get_users():
    """Get all users"""
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, int(request.args.get('limit', 20)))
        offset = (page - 1) * limit
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as count FROM users")
        total = cursor.fetchone()['count']
        
        cursor.execute("""
            SELECT id, username, email, role, created_at, is_active
            FROM users
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        users = list_from_rows(cursor.fetchall())
        
        conn.close()
        
        return success_response({
            "items": users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return error_response(str(e), 500)

@app.route("/api/admin/users/<int:user_id>/role", methods=["PUT"])
@admin_required
def admin_change_user_role(user_id):
    """Change user role (admin only)"""
    try:
        data = request.get_json()
        new_role = data.get('role', '').strip()
        
        if new_role not in ['user', 'admin']:
            return error_response("Invalid role", 400)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            return error_response("User not found", 404)
        
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        conn.commit()
        
        record_admin_action(
            request.current_user['user_id'],
            "CHANGE_USER_ROLE",
            f"Changed user {user_id} role to {new_role}"
        )
        
        conn.close()
        
        return success_response(None, f"User role updated to {new_role}")
        
    except Exception as e:
        return error_response(str(e), 500)

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def admin_delete_user(user_id):
    """Delete user (admin only)"""
    try:
        if user_id == request.current_user['user_id']:
            return error_response("Admin cannot delete own account", 400)

        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            conn.close()
            return error_response("User not found", 404)

        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

        record_admin_action(
            request.current_user['user_id'],
            "DELETE_USER",
            f"Deleted user {user_id}"
        )

        return success_response(None, "User deleted successfully")
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

# ===============================
# USER ROUTES
# ===============================

@app.route("/api/user/profile", methods=["GET"])
@token_required
def user_profile():
    """Get user profile"""
    try:
        user = get_user_by_id(request.current_user['user_id'])
        if not user:
            return error_response("User not found", 404)
        return success_response(user)
    except Exception as e:
        return error_response(str(e), 500)

@app.route("/api/user/profile/password", methods=["PUT"])
@token_required
def change_password():
    """Change user password"""
    try:
        data = request.get_json() or {}
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return error_response("Current and new passwords required", 400)
        
        if len(new_password) < 8:
            return error_response("New password must be at least 8 characters", 400)
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (request.current_user['user_id'],))
        user_row = cursor.fetchone()
        if not user_row:
            conn.close()
            return error_response("User not found", 404)

        # Verify current password
        if not verify_password(current_password, user_row['password_hash']):
            conn.close()
            return error_response("Current password is incorrect", 401)
        
        # Update password
        new_hash = hash_password(new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (new_hash, request.current_user['user_id'])
        )
        conn.commit()
        conn.close()
        
        return success_response({"message": "Password changed successfully"})
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/user/analysis", methods=["GET"])
@token_required
def user_analysis_history():
    """Get user's analysis history"""
    try:
        user_id = request.current_user['user_id']
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, int(request.args.get('limit', 20)))
        offset = (page - 1) * limit
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get count
        cursor.execute("SELECT COUNT(*) as count FROM user_analysis WHERE user_id = ?", (user_id,))
        total = cursor.fetchone()['count']
        
        # Get analysis history with news details
        cursor.execute("""
            SELECT ua.id, ua.news_id, ua.analysis_type, ua.created_at,
                   n.title, n.prediction, n.confidence
            FROM user_analysis ua
            LEFT JOIN news n ON ua.news_id = n.id
            WHERE ua.user_id = ?
            ORDER BY ua.created_at DESC
            LIMIT ? OFFSET ?
        """, (user_id, limit, offset))
        
        analyses = list_from_rows(cursor.fetchall())
        conn.close()
        
        return success_response(analyses)
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

# ===============================
# STATISTICS ROUTES
# ===============================

@app.route("/api/statistics/recent", methods=["GET"])
def statistics_recent():
    """Get recent statistics with trend data"""
    try:
        days = int(request.args.get('days', 7))
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get daily statistics for trending
        cursor.execute(f"""
            SELECT 
                date,
                prediction,
                COUNT(*) as count
            FROM news
            WHERE date >= datetime('now', '-{days} days')
            GROUP BY date, prediction
            ORDER BY date DESC
        """)
        daily_stats = list_from_rows(cursor.fetchall())
        
        # Aggregate by prediction
        cursor.execute(f"""
            SELECT 
                prediction,
                COUNT(*) as count,
                AVG(confidence) as avg_confidence
            FROM news
            WHERE date >= datetime('now', '-{days} days')
            GROUP BY prediction
        """)
        prediction_stats = list_from_rows(cursor.fetchall())
        
        # Category distribution
        cursor.execute(f"""
            SELECT 
                category,
                COUNT(*) as count,
                AVG(confidence) as avg_confidence
            FROM news
            WHERE date >= datetime('now', '-{days} days')
            GROUP BY category
            ORDER BY count DESC
        """)
        category_stats = list_from_rows(cursor.fetchall())
        
        # Total statistics
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN prediction = 'Hoax' THEN 1 ELSE 0 END) as hoax_count,
                SUM(CASE WHEN prediction = 'Legitimate' THEN 1 ELSE 0 END) as legitimate_count,
                AVG(confidence) as avg_confidence
            FROM news
            WHERE date >= datetime('now', '-{days} days')
        """)
        totals = dict_from_row(cursor.fetchone())
        
        conn.close()
        
        return success_response({
            "totals": {
                "total_articles": totals['total'] or 0,
                "hoax_count": totals['hoax_count'] or 0,
                "legitimate_count": totals['legitimate_count'] or 0,
                "avg_confidence": round(float(totals['avg_confidence']) if totals['avg_confidence'] else 0, 3),
                "hoax_percentage": round((totals['hoax_count'] / max(1, totals['total'])) * 100, 2) if totals['total'] else 0
            },
            "predictions": prediction_stats,
            "categories": category_stats,
            "daily_trend": daily_stats,
            "period_days": days
        })
        
    except Exception as e:
        return error_response(str(e), 500)

@app.route("/api/admin/logs", methods=["GET"])
@admin_required
def get_admin_logs():
    """Get admin activity logs"""
    try:
        page = max(1, int(request.args.get('page', 1)))
        limit = min(100, int(request.args.get('limit', 50)))
        offset = (page - 1) * limit
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get total count
        cursor.execute("SELECT COUNT(*) as count FROM admin_logs")
        total = cursor.fetchone()['count']
        
        # Get logs with user info
        cursor.execute("""
            SELECT 
                l.id, l.admin_id, l.action, l.details, l.created_at,
                u.username as admin_username
            FROM admin_logs l
            LEFT JOIN users u ON l.admin_id = u.id
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        logs = list_from_rows(cursor.fetchall())
        conn.close()
        
        return success_response({
            "logs": logs,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        })
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

@app.route("/api/admin/logs", methods=["POST"])
@admin_required
def create_admin_log():
    """Log an admin action"""
    try:
        data = request.get_json() or {}
        action = data.get('action', 'unknown')
        details = data.get('details', '')
        
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO admin_logs (admin_id, action, details)
            VALUES (?, ?, ?)
        """, (request.current_user['user_id'], action, details))
        
        conn.commit()
        conn.close()
        
        return success_response({"logged": True})
        
    except Exception as e:
        return error_response(str(e), 500, traceback.format_exc())

# ===============================
# ERROR HANDLERS
# ===============================

@app.errorhandler(404)
def not_found(error):
    return error_response("Endpoint not found", 404)

@app.errorhandler(500)
def server_error(error):
    return error_response("Internal server error", 500)

if __name__ == "__main__":
    app.run(debug=DEBUG, host=API_HOST, port=API_PORT, use_reloader=False)

