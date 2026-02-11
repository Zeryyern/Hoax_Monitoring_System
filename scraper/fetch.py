from builtins import Exception, len, print, set
from datetime import datetime
import traceback
from storage.storage import log_source_run
from scraper.sources.detik_hoax import scrape_detik_hoax
from scraper.sources.tempo_hoax import scrape_tempo_hoax
from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
from scraper.sources.antaranews import scrape_antaranews
from scraper.sources.turnbackhoax import fetch_turnbackhoax as scrape_turnbackhoax

def safe_run(scraper_func, source_name):
    print(f"\n[START] {source_name}")

    try:
        data = scraper_func()
        count = len(data)
        print(f"[SUCCESS] {source_name} → {len(data)} raw articles")
        log_source_run(source_name, "SUCCESS", count)
        return data

    except Exception as e:
        print(f"[ERROR] {source_name} is DOWN")
        print(f"Reason: {e}")
        traceback.print_exc()
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
            "source": source_name,
            "title": item.get("title", "").strip(),
            "url": url.strip(),
            "date": item.get("date", ""),
            "fetched_at": datetime.utcnow().isoformat()
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
