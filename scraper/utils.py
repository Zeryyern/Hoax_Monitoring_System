from builtins import len
import time
import requests
from datetime import datetime
from urllib.parse import urlparse
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

from urllib.parse import urlparse


from urllib.parse import urlparse


def is_valid_article_url(url: str, base_domain: str) -> bool:
    if not url:
        return False

    if url == "#":
        return False

    if not url.startswith("http"):
        return False

    parsed = urlparse(url)

    # Must belong to correct domain
    if base_domain not in parsed.netloc:
        return False

    # Reject homepage
    if parsed.path in ["", "/"]:
        return False

    reject_keywords = [
        "kategori",
        "category",
        "tag",
        "author",
        "search",
        "infografis",
        "layanan",
        "kebijakan",
        "koreksi",
    ]

    for word in reject_keywords:
        if word in parsed.path.lower():
            return False

    return True
