import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def _load_env_fallback(env_path: str):
    """Minimal .env loader fallback when python-dotenv is unavailable."""
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                if value and ((value[0] == value[-1]) and value.startswith(("'", '"'))):
                    value = value[1:-1]
                if key and key not in os.environ:
                    os.environ[key] = value
    except Exception:
        # Keep non-fatal behavior
        pass


# Load .env if available (non-fatal if missing)
_env_path = os.path.join(BASE_DIR, '.env')
try:
    from dotenv import load_dotenv
    load_dotenv(_env_path)
except Exception:
    _load_env_fallback(_env_path)

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
# EMAIL/NOTIFICATION SETTINGS
# ===============================

SMTP_HOST = os.getenv('SMTP_HOST', '').strip()
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '').strip()
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '').strip()
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USERNAME).strip()

# ===============================
# ML/NLP SETTINGS
# ===============================

CONFIDENCE_THRESHOLD = 0.5  # Minimum confidence for classification
MIN_TEXT_LENGTH = 20  # Minimum character length for analysis
