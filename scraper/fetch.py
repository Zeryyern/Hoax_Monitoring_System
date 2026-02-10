from builtins import Exception, len, print, set
from datetime import datetime  
import traceback
from scraper.sources.detik_hoax import scrape_detik_hoax
from scraper.sources.tempo_hoax import scrape_tempo_hoax
from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
from scraper.sources.antaranews import scrape_antaranews
from scraper.sources.turnbackhoax import fetch_turnbackhoax as scrape_turnbackhoax

def safe_run(scraper_func, source_name):
    print(f"\n[START] {source_name}")

    try:
        data = scraper_func()
        print(f"[SUCCESS] {source_name} → {len(data)} articles")
        return data

    except Exception as e:
        print(f"[ERROR] {source_name} is DOWN")
        print(f"Reason: {e}")
        traceback.print_exc()
        return []

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
    data = []

    sources = [
        ("TurnBackHoax", scrape_turnbackhoax),
        ("Antara Anti-Hoax", scrape_antaranews),
        ("Kompas CekFakta", scrape_kompas_cekfakta),
        ("Detik Hoax or Not", scrape_detik_hoax),
        ("Tempo Hoax", scrape_tempo_hoax),
    ]

    for name, scraper_func in sources:
        print(f"\n[START] {name}")
        try:
            results = scraper_func()
            print(f"[SUCCESS] {name} → {len(results)} articles")
            data.extend(results)
        except Exception as e:
            print(f"[ERROR] {name} is DOWN")
            print(f"Reason: {e}")

    return deduplicate(data)
