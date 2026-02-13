from builtins import len, print
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time

from scraper.utils import is_valid_article_url

SOURCE_NAME = "Kompas Cek Fakta"
BASE_URL = "https://cekfakta.kompas.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def scrape_kompas_cekfakta(pages=3):
    articles = []
    seen = set()

    for page in range(1, pages + 1):
        url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        r = requests.get(url, headers=HEADERS, timeout=20)

        print(f"STATUS page {page}: {r.status_code}")

        if r.status_code != 200:
            continue

        soup = BeautifulSoup(r.text, "html.parser")

        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(strip=True)

            if not title:
                continue

            if "/read/" not in href:
                continue

            if href.startswith("/"):
                href = "https://cekfakta.kompas.com" + href
                
            #after url normalization and before storing check if url is valid!
            if not is_valid_article_url(href, "cekfakta.kompas.com"):
                continue


            key = (title, href)
            if key in seen:
                continue

            seen.add(key)

            articles.append({
                "source": SOURCE_NAME,
                "title": title,
                "url": href,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            })

        time.sleep(1)

    return articles


if __name__ == "__main__":
    results = scrape_kompas_cekfakta(pages=2)
    print(f"\nTOTAL ARTICLES: {len(results)}\n")
    for r in results:
        print(r)
