from builtins import Exception, len, print, set
from datetime import datetime, timezone, timedelta
import traceback
from storage.storage import log_source_run
from scraper.sources.detik_hoax import scrape_detik_hoax
from scraper.sources.tempo_hoax import scrape_tempo_hoax
from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
from scraper.sources.antaranews import scrape_antaranews
from scraper.sources.turnbackhoax import scrape_turnbackhoax
from logger import logger
import requests

# health checker function
def get_health_status(count):
    if count == 0:
        return "DOWN [FAIL]"
    elif count < 5:
        return "DEGRADED [WARN]"
    return "HEALTHY [OK]"


def safe_run(scraper_func, source_name):
    print(f"\n[START] {source_name}")

    try:
        data = scraper_func()
        if not data:
            data = []

        try:
            count = len(data)
        except TypeError:
            logger.warning(f"{source_name} returned non-iterable data; coercing to empty list")
            data = []
            count = 0

        health = get_health_status(count)

        print(f"[SUCCESS] {source_name} -> {count} raw articles")
        print(f"[HEALTH] {source_name}: {health}")

        log_source_run(source_name, "SUCCESS", count)
        return data

    except requests.exceptions.ConnectTimeout as e:
        logger.warning(f"[TIMEOUT] {source_name}: Connection timeout. Will retry next run.")
        print(f"[TIMEOUT] {source_name}: Connection timeout - skipping")
        log_source_run(source_name, "TIMEOUT", 0)
        return []
    
    except requests.exceptions.RequestException as e:
        logger.warning(f"[NETWORK ERROR] {source_name}: {type(e).__name__}")
        print(f"[ERROR] {source_name}: Network error - {type(e).__name__}")
        log_source_run(source_name, "NETWORK_ERROR", 0)
        return []

    except Exception as e:
        logger.exception(f"[ERROR] {source_name} is DOWN [FAIL] Reason: {e}")
        print(f"[ERROR] {source_name} is DOWN [FAIL] - see logs for details")
        log_source_run(source_name, "FAILURE", 0)
        return []


def normalize_and_filter(items, source_name):
    """
    Enforce schema + drop invalid articles
    """
    valid = []
    dropped = 0

    for item in items:
        url = item.get("url")

        if not url:
            dropped += 1
            continue

        valid.append({
            "source": item.get("source", source_name),
            "title": item.get("title", "").strip(),
            "url": url.strip(),
            "published_at": item.get("published_at"),
            "fetched_at": datetime.now(timezone.utc).isoformat()
        })

    if dropped:
        print(f"[WARN] {source_name}: {dropped} articles dropped (missing URL)")

    return valid


def deduplicate(items):
    seen = set()
    unique = []

    for item in items:
        url = item["url"]
        if url not in seen:
            seen.add(url)
            unique.append(item)

    return unique


def fetch_all():
    """Fetch articles from all sources with graceful error handling"""
    all_items = []

    sources = [
        ("TurnBackHoax", scrape_turnbackhoax),
        ("Antara Anti-Hoax", scrape_antaranews),
        ("Kompas CekFakta", scrape_kompas_cekfakta),
        ("Detik Hoax or Not", scrape_detik_hoax),
        ("Tempo Hoax", scrape_tempo_hoax),
    ]

    for name, scraper_func in sources:
        raw = safe_run(scraper_func, name)
        cleaned = normalize_and_filter(raw, name)
        all_items.extend(cleaned)

    print(f"\n[INFO] Total valid articles before dedup: {len(all_items)}")

    final = deduplicate(all_items)
    print(f"[INFO] Total articles after dedup: {len(final)}")

    return final
