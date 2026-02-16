from builtins import hasattr
import logging
import os
from datetime import datetime
import sys

# Ensure logs directory exists
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Log file name based on date
log_filename = os.path.join(LOG_DIR, f"system_{datetime.now().date()}.log")

# Create logger
logger = logging.getLogger("HoaxMonitoring")
logger.setLevel(logging.DEBUG)  # Capture all levels

# Prevent duplicate logs
if not logger.handlers:

    # File handler (stores logs in file)
    file_handler = logging.FileHandler(log_filename, encoding='utf-8')
    file_handler.setLevel(logging.INFO)

    # Console handler with encoding fix for Windows
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Force UTF-8 encoding for console on Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    # Log format without emojis for Windows compatibility
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
