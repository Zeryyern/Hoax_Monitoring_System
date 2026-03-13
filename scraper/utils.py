from builtins import len
import gzip
import json
import re
import time
import requests
from datetime import datetime
from dateutil import parser as date_parser
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
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

COMMENT_COUNT_PATTERN = re.compile(r"(?i)(?:^|\b)\d+\s*komentar(?:\b|(?=[A-Z]))")
MULTI_SPACE_PATTERN = re.compile(r"\s+")
TRAILING_NUMERIC_ID_PATTERN = re.compile(r"\s+\d{5,}\s*$")


def clean_scraped_title(title: str) -> str:
    """
    Remove noisy fragments from scraped titles, such as trailing comment counters:
    '739komentar' or '739 komentar'.
    """
    if not title:
        return ""

    cleaned = COMMENT_COUNT_PATTERN.sub(" ", title)
    cleaned = cleaned.replace("|", " ").replace("•", " ")
    # Some sources append long numeric IDs to titles (e.g. Tempo).
    cleaned = TRAILING_NUMERIC_ID_PATTERN.sub("", cleaned)
    cleaned = MULTI_SPACE_PATTERN.sub(" ", cleaned).strip(" -:;,.")
    return cleaned


def _safe_parse_datetime(value: str) -> str | None:
    if not value:
        return None
    try:
        parsed = date_parser.parse(value, fuzzy=True)
        return parsed.isoformat()
    except Exception:
        return None


def extract_source_published_at(soup) -> str | None:
    """
    Extract source publication datetime from common metadata patterns.
    """
    if soup is None:
        return None

    selector_candidates = [
        ('meta[property="article:published_time"]', "content"),
        ('meta[name="article:published_time"]', "content"),
        ('meta[property="og:published_time"]', "content"),
        ('meta[itemprop="datePublished"]', "content"),
        ('meta[name="publishdate"]', "content"),
        ('meta[name="pubdate"]', "content"),
        ("time[datetime]", "datetime"),
        ("time", "text"),
        ("[data-datetime]", "data-datetime"),
        (".publish-date", "text"),
        (".article-date", "text"),
        (".posted-on", "text"),
        (".date", "text"),
    ]

    for selector, attr in selector_candidates:
        node = soup.select_one(selector)
        if not node:
            continue

        if attr == "text":
            raw = node.get_text(" ", strip=True)
        else:
            raw = (node.get(attr) or "").strip()

        parsed = _safe_parse_datetime(raw)
        if parsed:
            return parsed

    # JSON-LD fallback
    for script in soup.select('script[type="application/ld+json"]'):
        raw_json = (script.string or script.get_text() or "").strip()
        if not raw_json:
            continue
        try:
            payload = json.loads(raw_json)
        except Exception:
            continue

        candidates = payload if isinstance(payload, list) else [payload]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            for key in ("datePublished", "dateCreated", "uploadDate", "dateModified"):
                parsed = _safe_parse_datetime(str(item.get(key) or ""))
                if parsed:
                    return parsed

    return None


def extract_source_title(soup) -> str | None:
    """
    Extract an article title from common metadata patterns (og:title/title/h1).
    """
    if soup is None:
        return None

    meta = soup.select_one('meta[property="og:title"]')
    if meta:
        raw = (meta.get("content") or "").strip()
        if raw:
            return raw

    meta = soup.select_one('meta[name="twitter:title"]')
    if meta:
        raw = (meta.get("content") or "").strip()
        if raw:
            return raw

    if soup.title and soup.title.string:
        raw = str(soup.title.string).strip()
        if raw:
            return raw

    h1 = soup.find("h1")
    if h1:
        raw = h1.get_text(" ", strip=True)
        if raw:
            return raw

    return None


def extract_next_page_url(soup, current_url: str, required_domain: str) -> str | None:
    """
    Try to detect the next listing page URL from common pagination patterns.
    """
    if soup is None:
        return None

    selectors = [
        'a[rel="next"]',
        'link[rel="next"]',
        "a.next",
        "li.next a",
        ".pagination a.next",
        'a[aria-label*="Next"]',
        'a[aria-label*="next"]',
    ]

    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        href = (node.get("href") or "").strip()
        if not href:
            continue
        candidate = urljoin(current_url, href)
        if required_domain in urlparse(candidate).netloc:
            return candidate

    text_markers = {"next", "berikutnya", "selanjutnya", "older", "lanjut", ">", ">>", "›", "»"}
    for node in soup.find_all("a", href=True):
        label = (node.get_text(" ", strip=True) or "").lower()
        if label not in text_markers:
            continue
        candidate = urljoin(current_url, node["href"])
        if required_domain in urlparse(candidate).netloc:
            return candidate

    return None


def collect_urls_from_sitemap(
    sitemap_url: str,
    session: requests.Session,
    required_domain: str,
    url_filter=None,
    max_urls: int = 20000,
    max_sitemaps: int = 2000,
) -> list[str]:
    """
    Crawl sitemap index/urlset recursively and return unique URLs.
    """
    if not sitemap_url:
        return []

    pending = [sitemap_url]
    seen_sitemaps = set()
    seen_urls = set()
    collected = []

    while pending and len(seen_sitemaps) < max_sitemaps and len(collected) < max_urls:
        current = pending.pop(0)
        if current in seen_sitemaps:
            continue
        seen_sitemaps.add(current)

        try:
            resp = session.get(current, timeout=25)
            if resp.status_code != 200:
                continue
            raw_text = ""
            try:
                content_type = (resp.headers.get("Content-Type") or "").lower()
                if current.lower().endswith(".gz") or "gzip" in content_type:
                    raw_text = gzip.decompress(resp.content).decode("utf-8", errors="ignore")
                else:
                    raw_text = resp.text or resp.content.decode("utf-8", errors="ignore")
            except Exception:
                raw_text = resp.text or ""

            if not raw_text.strip():
                continue

            xml = BeautifulSoup(raw_text, "xml")

            # sitemap index
            for loc in xml.select("sitemap > loc"):
                next_map = (loc.get_text(strip=True) or "").strip()
                if next_map and next_map not in seen_sitemaps:
                    pending.append(next_map)

            # urlset
            for loc in xml.select("url > loc"):
                u = (loc.get_text(strip=True) or "").strip()
                if not u:
                    continue
                if required_domain not in urlparse(u).netloc:
                    continue
                if url_filter and not url_filter(u):
                    continue
                if u in seen_urls:
                    continue
                seen_urls.add(u)
                collected.append(u)
                if len(collected) >= max_urls:
                    break
        except Exception:
            continue

    return collected


def collect_entries_from_sitemap(
    sitemap_url: str,
    session: requests.Session,
    required_domain: str,
    url_filter=None,
    max_urls: int = 500000,
    max_sitemaps: int = 50000,
) -> list[dict]:
    """
    Crawl sitemap index/urlset recursively and return unique URL entries:
    [{"url": "...", "lastmod": "..."}].
    """
    if not sitemap_url:
        return []

    pending = [sitemap_url]
    seen_sitemaps = set()
    seen_urls = set()
    collected = []

    while pending and len(seen_sitemaps) < max_sitemaps and len(collected) < max_urls:
        current = pending.pop(0)
        if current in seen_sitemaps:
            continue
        seen_sitemaps.add(current)

        try:
            resp = session.get(current, timeout=25)
            if resp.status_code != 200:
                continue

            raw_text = ""
            try:
                content_type = (resp.headers.get("Content-Type") or "").lower()
                if current.lower().endswith(".gz") or "gzip" in content_type:
                    raw_text = gzip.decompress(resp.content).decode("utf-8", errors="ignore")
                else:
                    raw_text = resp.text or resp.content.decode("utf-8", errors="ignore")
            except Exception:
                raw_text = resp.text or ""

            if not raw_text.strip():
                continue

            xml = BeautifulSoup(raw_text, "xml")

            for loc in xml.select("sitemap > loc"):
                next_map = (loc.get_text(strip=True) or "").strip()
                if next_map and next_map not in seen_sitemaps:
                    pending.append(next_map)

            for node in xml.select("url"):
                loc_node = node.select_one("loc")
                if not loc_node:
                    continue
                u = (loc_node.get_text(strip=True) or "").strip()
                if not u:
                    continue
                if required_domain not in urlparse(u).netloc:
                    continue
                if url_filter and not url_filter(u):
                    continue
                if u in seen_urls:
                    continue

                lastmod_node = node.select_one("lastmod")
                lastmod = (lastmod_node.get_text(strip=True) if lastmod_node else "") or None

                seen_urls.add(u)
                collected.append({"url": u, "lastmod": lastmod})
                if len(collected) >= max_urls:
                    break
        except Exception:
            continue

    return collected


def discover_sitemaps_from_robots(
    robots_url: str,
    session: requests.Session,
    required_domain: str,
    limit: int = 200,
) -> list[str]:
    """
    Parse robots.txt and collect declared sitemap URLs.
    """
    if not robots_url:
        return []

    discovered = []
    seen = set()
    try:
        resp = session.get(robots_url, timeout=20)
        if resp.status_code != 200:
            return []
        for line in (resp.text or "").splitlines():
            line = (line or "").strip()
            if not line.lower().startswith("sitemap:"):
                continue
            candidate = line.split(":", 1)[1].strip()
            if not candidate:
                continue
            host = (urlparse(candidate).netloc or "").lower()
            if required_domain not in host:
                continue
            if candidate in seen:
                continue
            seen.add(candidate)
            discovered.append(candidate)
            if len(discovered) >= int(limit):
                break
    except Exception:
        return []

    return discovered


def collect_entries_from_sitemaps(
    sitemap_urls: list[str],
    session: requests.Session,
    required_domain: str,
    url_filter=None,
    max_urls_per_seed: int = 200000,
    max_sitemaps_per_seed: int = 20000,
) -> list[dict]:
    """
    Aggregate entries from multiple sitemap seeds while deduplicating URLs.
    """
    all_entries: list[dict] = []
    seen_urls = set()

    for seed in sitemap_urls:
        entries = collect_entries_from_sitemap(
            sitemap_url=seed,
            session=session,
            required_domain=required_domain,
            url_filter=url_filter,
            max_urls=max_urls_per_seed,
            max_sitemaps=max_sitemaps_per_seed,
        )
        for entry in entries:
            u = entry.get("url")
            if not u or u in seen_urls:
                continue
            seen_urls.add(u)
            all_entries.append(entry)

    return all_entries


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
        "video",
        "forum",
        "media",
        "gallery",
        "foto",
        "photo",
        "tv",
        "infografis",
        "layanan",
        "relawan",
        "kontak",
        "tentang-kami",
        "kebijakan",
        "kode-etik",
        "ketentuan-layanan",
        "kebijakan-privasi",
    ]

    for word in reject_keywords:
        if word in parsed.path.lower():
            return False

    return True
