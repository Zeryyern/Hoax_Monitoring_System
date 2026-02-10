import time
import requests
from datetime import datetime

HEADERS = {
    "User-Agent": "Academic-Hoax-Research-Bot/1.0"
}

def polite_sleep(seconds, stop_event):
    """Sleep in small chunks so Stop button works instantly"""
    for _ in range(seconds):
        if stop_event.is_set():
            return
        time.sleep(1)

def safe_request(url, timeout=10):
    return requests.get(url, headers=HEADERS, timeout=timeout)

def now_utc():
    return datetime.utcnow().isoformat()
