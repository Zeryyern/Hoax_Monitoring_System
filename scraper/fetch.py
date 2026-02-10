from builtins import Exception, len, print, set 
import traceback
from datetime import datetime

from scraper.sources.detik_hoax import scrape_detik_hoax
from scraper.sources.tempo_hoax import scrape_tempo_hoax
from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
from scraper.sources.antaranews import scrape_antaranews
from scraper.sources.turnbackhoax import fetch_turnbackhoax as scrape_turnbackhoax


def safe_run(scraper_func, source_name):
    """
    Run a scraper safely.
    Returns: (articles_list, status_dict)
    """
    print(f"\n[START] {source_name}")

    try:
        data = scraper_func()
        print(f"[SUCCESS] {source_name} → {len(data)} articles")

        return data, {
            "status": "UP",
            "count": len(data),
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        print(f"[ERROR] {source_name} is DOWN")
        print(f"Reason: {e}")
        traceback.print_exc()

        return [], {
            "status": "DOWN",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


def deduplicate(items):
    seen = set()
    unique = []

    for item in items:
        url = item.get("url")
        if url and url not in seen:
            seen.add(url)
            unique.append(item)

    return unique


def fetch_all():
    all_data = []
    source_status = {}

    sources = [
        ("TurnBackHoax", scrape_turnbackhoax),
        ("Antara Anti-Hoax", scrape_antaranews),
        ("Kompas CekFakta", scrape_kompas_cekfakta),
        ("Detik Hoax or Not", scrape_detik_hoax),
        ("Tempo Hoax", scrape_tempo_hoax),
    ]

    for name, scraper_func in sources:
        data, status = safe_run(scraper_func, name)
        all_data.extend(data)
        source_status[name] = status

    all_data = deduplicate(all_data)

    return all_data, source_status
