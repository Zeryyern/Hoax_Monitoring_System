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
from scraper.utils import clean_scraped_title, extract_source_published_at, extract_source_title
from logger import logger
import requests
import re

# Last run error per source, used by admin UI to surface connectivity problems (e.g. WinError 10013).
LAST_RUN_ERROR: dict[str, str | None] = {}

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
        LAST_RUN_ERROR[source_name] = None
        # Success is logged by the caller after normalization so the stored
        # `articles_collected` reflects usable articles (not raw link counts).
        return data

    except requests.exceptions.ConnectTimeout as e:
        logger.warning(f"[TIMEOUT] {source_name}: Connection timeout. Will retry next run.")
        print(f"[TIMEOUT] {source_name}: Connection timeout - skipping")
        log_source_run(source_name, "TIMEOUT", 0)
        LAST_RUN_ERROR[source_name] = f"{type(e).__name__}: {e}"
        return []
    
    except requests.exceptions.RequestException as e:
        logger.warning(f"[NETWORK ERROR] {source_name}: {type(e).__name__}")
        print(f"[ERROR] {source_name}: Network error - {type(e).__name__}")
        log_source_run(source_name, "NETWORK_ERROR", 0)
        LAST_RUN_ERROR[source_name] = f"{type(e).__name__}: {e}"
        return []

    except Exception as e:
        logger.exception(f"[ERROR] {source_name} is DOWN [FAIL] Reason: {e}")
        print(f"[ERROR] {source_name} is DOWN [FAIL] - see logs for details")
        log_source_run(source_name, "FAILURE", 0)
        LAST_RUN_ERROR[source_name] = f"{type(e).__name__}: {e}"
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
        "artikel headline",
        "topik pilihan",
        "artikel terpopuler",
        "parapuan",
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

        # Source-specific URL allowlist rules (prevents crawling nav/footer links).
        if "kompas" in source.lower():
            netloc = (parsed.netloc or "").lower()
            ok = False
            if netloc == "www.kompas.com" and path.startswith("/tren/read/"):
                ok = True
            if netloc == "cekfakta.kompas.com" and path.startswith("/read/"):
                ok = True
            if not ok:
                dropped += 1
                continue

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

        provided_prediction = (item.get("prediction") or "").strip()
        prediction = provided_prediction if provided_prediction in ("Hoax", "Legitimate") else None

        valid.append({
            "source": source,
            "title": title,
            "url": normalized_url,
            "published_at": item.get("published_at"),
            "prediction": prediction,
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


def _infer_prediction_from_text(text: str) -> str | None:
    if not text:
        return None
    lowered = str(text).casefold()
    # Strong signals first.
    if "[" in lowered and "]" in lowered:
        # Common tags: [HOAKS], [SALAH], [FAKTA], [BENAR]
        if any(tag in lowered for tag in ("[hoaks", "[hoax", "[salah", "[misinformasi", "[disinformasi", "[keliru", "[palsu")):
            return "Hoax"
        if any(tag in lowered for tag in ("[fakta", "[benar", "[valid", "[true")):
            return "Legitimate"
    # Conservative word-based fallback (only when clearly a verdict label).
    if lowered.startswith(("hoaks", "hoax", "salah")):
        return "Hoax"
    if lowered.startswith(("fakta", "benar")):
        return "Legitimate"
    return None


def _fetch_enrichment_from_source(url: str, timeout_seconds: int = 15) -> dict:
    """
    Fetch a page and extract title + published_at.
    Prediction is inferred from extracted title when possible.
    """
    try:
        response = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            timeout=timeout_seconds,
        )
        if response.status_code != 200 or not response.text:
            return {}
        soup = BeautifulSoup(response.text, "html.parser")
        published_at = extract_source_published_at(soup)
        raw_title = extract_source_title(soup)
        title = clean_scraped_title(raw_title or "") if raw_title else None
        prediction = _infer_prediction_from_text(title or "")

        if not prediction:
            # Try to infer from explicit verdict sections to avoid NLP mislabels.
            text = soup.get_text(" ", strip=True)
            if text:
                hoax_pat = r"(?i)\b(kesimpulan|hasil|verdict|status)\b\s*[:\-]?\s*(hoaks?|hoax|salah|keliru|palsu|tidak benar|disinformasi|misinformasi)\b"
                fact_pat = r"(?i)\b(kesimpulan|hasil|verdict|status)\b\s*[:\-]?\s*(fakta|benar|valid)\b"
                if re.search(fact_pat, text):
                    prediction = "Legitimate"
                elif re.search(hoax_pat, text):
                    prediction = "Hoax"

        return {"published_at": published_at, "title": title, "prediction": prediction}
    except Exception:
        return {}


def fetch_enrichment_from_source(url: str, timeout_seconds: int = 15) -> dict:
    """
    Public wrapper used by API maintenance endpoints.
    """
    return _fetch_enrichment_from_source(url, timeout_seconds=timeout_seconds) or {}


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


def enrich_from_source_pages(items, source_name, max_workers: int = 8):
    """
    Enrich items by fetching their source pages when needed.
    - Fill missing `published_at`
    - Replace slug-like titles with real page titles
    - Infer `prediction` from explicit title tags (e.g. [HOAKS], [FAKTA])
    """
    if not items:
        return items

    def looks_like_slug_title(t: str) -> bool:
        value = (t or "").strip()
        if not value:
            return True
        if re.search(r"\s\d{5,}\s*$", value):
            return True
        # Slug-derived titles are often all-lowercase.
        if value == value.lower() and len(value) >= 20:
            return True
        return False

    pending = []
    for index, item in enumerate(items):
        title = (item.get("title") or "").strip()
        needs_title = looks_like_slug_title(title)
        needs_pub = not item.get("published_at")
        needs_pred = not (item.get("prediction") in ("Hoax", "Legitimate"))
        if not (needs_title or needs_pub or needs_pred):
            continue
        url = (item.get("url") or "").strip()
        if not url:
            continue
        pending.append((index, url))

    if not pending:
        return items

    worker_count = max(2, min(16, int(max_workers or 8)))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        future_to_index = {executor.submit(_fetch_enrichment_from_source, url): index for index, url in pending}
        for future in as_completed(future_to_index):
            index = future_to_index[future]
            try:
                enriched = future.result() or {}
            except Exception:
                enriched = {}
            if not enriched:
                continue

            if enriched.get("published_at") and not items[index].get("published_at"):
                items[index]["published_at"] = enriched["published_at"]
            if enriched.get("title"):
                items[index]["title"] = clean_scraped_title(enriched["title"])
            if enriched.get("prediction") and not (items[index].get("prediction") in ("Hoax", "Legitimate")):
                items[index]["prediction"] = enriched["prediction"]

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
        ("Kompas Cek Fakta", scrape_kompas_cekfakta),
        ("Detik Hoax or Not", scrape_detik_hoax),
        ("Tempo Hoax", scrape_tempo_hoax),
    ]

    for name, scraper_func in sources:
        raw = safe_run(scraper_func, name)
        cleaned = normalize_and_filter(raw, name)
        # Only log success when scraper returned something. Error paths already log
        # TIMEOUT/NETWORK_ERROR/FAILURE with 0.
        if raw:
            log_source_run(name, "SUCCESS", len(cleaned))
        all_items.extend(cleaned)

    print(f"\n[INFO] Total valid articles before dedup: {len(all_items)}")

    final = deduplicate(all_items)
    print(f"[INFO] Total articles after dedup: {len(final)}")

    return final
