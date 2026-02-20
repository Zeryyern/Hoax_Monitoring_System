import os

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

# Environment mode
API_ENV = os.getenv('API_ENV', 'development').strip().lower()

# Production must always provide SECRET_KEY explicitly.
_raw_secret_key = os.getenv('SECRET_KEY', '').strip()
if _raw_secret_key:
    SECRET_KEY = _raw_secret_key
elif API_ENV == 'production':
    raise RuntimeError("SECRET_KEY is required when API_ENV=production")
else:
    SECRET_KEY = 'dev-insecure-secret-change-me'
TOKEN_EXPIRY_HOURS = int(os.getenv('TOKEN_EXPIRY_HOURS', '24'))
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '')

# Super admin (immutable overseer account)
SUPER_ADMIN_USERNAME = os.getenv('SUPER_ADMIN_USERNAME', 'zeryyern_admin')
SUPER_ADMIN_EMAIL = os.getenv('SUPER_ADMIN_EMAIL', 'zeryyern_admin@hoax-monitor.com')
SUPER_ADMIN_PASSWORD = os.getenv('SUPER_ADMIN_PASSWORD', '').strip()
BOOTSTRAP_ADMIN_TOKEN = os.getenv('BOOTSTRAP_ADMIN_TOKEN', '').strip()
BOOTSTRAP_ADMIN_ENABLED = os.getenv('BOOTSTRAP_ADMIN_ENABLED', 'false').lower() == 'true'

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

if API_ENV == 'production':
    if not CORS_ORIGINS or CORS_ORIGINS.strip() == '*':
        raise RuntimeError("CORS_ORIGINS must be a non-wildcard value in production")

# ===============================
# ML/NLP SETTINGS
# ===============================

CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence for classification
MIN_TEXT_LENGTH = 20  # Minimum character length for analysis
