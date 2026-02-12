import logging
import os
from datetime import datetime

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
    file_handler = logging.FileHandler(log_filename)
    file_handler.setLevel(logging.INFO)

    # Console handler (prints to terminal)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Log format
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
