import os
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load .env if available (non-fatal if missing)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, '.env'))
except Exception:
    pass

# ===============================
# DATABASE CONFIGURATION
# ===============================

_raw_db_path = os.getenv('DB_PATH', os.path.join('data', 'hoax.db'))
DB_PATH = _raw_db_path if os.path.isabs(_raw_db_path) else os.path.normpath(os.path.join(BASE_DIR, _raw_db_path))
DATA_DIR = os.path.dirname(DB_PATH)

# ===============================
# SECURITY CONFIGURATION
# ===============================

SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_urlsafe(32))
TOKEN_EXPIRY_HOURS = int(os.getenv('TOKEN_EXPIRY_HOURS', '24'))
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')

# ===============================
# SCRAPER SETTINGS
# ===============================

REQUEST_TIMEOUT = 10  # seconds
USER_AGENT = "HoaxMonitoringBot/1.0"
DEFAULT_SCRAPE_INTERVAL = 300  # seconds (5 minutes)

# ===============================
# SYSTEM SETTINGS
# ===============================

DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
ENABLE_LOGGING = os.getenv('ENABLE_LOGGING', 'True').lower() == 'true'
HEALTH_FAILURE_THRESHOLD = 3  # consecutive failures before marking unhealthy
LOG_DIR = os.getenv('LOG_DIR', os.path.join(BASE_DIR, 'logs'))
LOG_DIR = LOG_DIR if os.path.isabs(LOG_DIR) else os.path.normpath(os.path.join(BASE_DIR, LOG_DIR))

# Ensure log directory exists
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR, exist_ok=True)

# ===============================
# SOURCE LIST
# ===============================

SOURCES = [
    "antaranews",
    "detik_hoax",
    "kompas_cekfakta",
    "tempo_hoax",
    "turnbackhoax"
]

# ===============================
# API CONFIGURATION
# ===============================

API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('API_PORT', '5000'))
API_ENV = os.getenv('API_ENV', 'development')

# ===============================
# ML/NLP SETTINGS
# ===============================

CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence for classification
MIN_TEXT_LENGTH = 20  # Minimum character length for analysis
