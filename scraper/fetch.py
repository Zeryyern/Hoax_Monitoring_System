from builtins import Exception, len, print, set
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
import traceback
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from storage.storage import log_source_run
from scraper.sources.detik_hoax import scrape_detik_hoax
from scraper.sources.tempo_hoax import scrape_tempo_hoax
from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
from scraper.sources.antaranews import scrape_antaranews
from scraper.sources.turnbackhoax import scrape_turnbackhoax
from scraper.utils import clean_scraped_title, extract_source_published_at
from logger import logger
import requests
import re

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
    blocked_segments = (
        "/video",
        "/forum",
        "/media",
        "/infografis",
        "/layanan",
        "/relawan",
        "/kontak",
        "/tentang-kami",
        "/kebijakan",
        "/kode-etik",
        "/ketentuan-layanan",
        "/kebijakan-privasi",
    )
    blocked_url_substrings = (
        "account.kompas.com/login",
    )
    bad_title_exact = {
        "login",
        "log in",
        "sign in",
        "signin",
        "home",
        "index",
        "beranda",
        "403",
        "404",
        "500",
    }

    for item in items:
        url = item.get("url")
        title = clean_scraped_title(item.get("title", ""))
        source = item.get("source", source_name)

        if not url or not title:
            dropped += 1
            continue
        normalized_url = url.strip()
        lower_url = normalized_url.lower()
        parsed = urlparse(normalized_url)
        path = (parsed.path or "").lower()
        title_lower = title.strip().casefold()

        if any(blocked in lower_url for blocked in blocked_url_substrings):
            dropped += 1
            continue

        # Skip obvious auth pages.
        if "/login" in path:
            dropped += 1
            continue

        # Drop scrape failures: numeric-only titles, auth/landing titles, etc.
        if title_lower in bad_title_exact or re.fullmatch(r"[\d\s\W_]+", title, flags=re.UNICODE):
            dropped += 1
            continue

        if any(seg in lower_url for seg in blocked_segments):
            dropped += 1
            continue

        # Strict rule: TurnBackHoax content should only come from /articles/<id-slug>.
        if "turnbackhoax" in source.lower() and "/articles/" not in path:
            dropped += 1
            continue

        valid.append({
            "source": source,
            "title": title,
            "url": normalized_url,
            "published_at": item.get("published_at"),
            "fetched_at": datetime.now(timezone.utc).isoformat()
        })

    if dropped:
        print(f"[WARN] {source_name}: {dropped} articles dropped (missing URL)")

    return valid


def _fetch_published_at_from_source(url: str, timeout_seconds: int = 15):
    try:
        response = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            timeout=timeout_seconds,
        )
        if response.status_code != 200 or not response.text:
            return None
        soup = BeautifulSoup(response.text, "html.parser")
        return extract_source_published_at(soup)
    except Exception:
        return None


def enrich_missing_published_at(items, source_name, max_workers: int = 8):
    """
    Fill missing publication datetime directly from article source pages.
    """
    if not items:
        return items

    pending = []
    for index, item in enumerate(items):
        if item.get("published_at"):
            continue
        url = (item.get("url") or "").strip()
        if not url:
            continue
        pending.append((index, url))

    if not pending:
        return items

    updated = 0
    worker_count = max(2, min(16, int(max_workers or 8)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_index = {
            executor.submit(_fetch_published_at_from_source, url): index
            for index, url in pending
        }
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                published_at = future.result()
            except Exception:
                published_at = None
            if published_at:
                items[index]["published_at"] = published_at
                updated += 1

    print(f"[INFO] {source_name}: publication datetime enriched for {updated}/{len(pending)} items")
    return items


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
