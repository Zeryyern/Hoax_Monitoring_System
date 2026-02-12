import os

# ===============================
# DATABASE CONFIGURATION
# ===============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "hoax.db")

# ===============================
# SCRAPER SETTINGS
# ===============================

REQUEST_TIMEOUT = 10  # seconds
USER_AGENT = "HoaxMonitoringBot/1.0"

# ===============================
# SYSTEM SETTINGS
# ===============================

ENABLE_LOGGING = True
HEALTH_FAILURE_THRESHOLD = 3  # consecutive failures before marking unhealthy

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
