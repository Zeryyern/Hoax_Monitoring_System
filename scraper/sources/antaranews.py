from builtins import len, print, range, set
import requests # type: ignore
from bs4 import BeautifulSoup # type: ignore
from datetime import datetime
import time
from scraper.utils import is_valid_article_url

BASE_URL = "https://www.antaranews.com/slug/anti-hoax"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

def scrape_antaranews(pages=5):
    results = []
    seen = set()

    for page in range(1, pages + 1):
        url = f"{BASE_URL}?page={page}"
        r = requests.get(url, headers=HEADERS, timeout=20)
        print(f"STATUS page {page}:", r.status_code)

        soup = BeautifulSoup(r.text, "html.parser")

        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(strip=True)

            if not title:
                continue

            # strict anti-hoax filtering
            if "/berita/" not in href:
                continue

            if "hoaks" not in title.lower() and "hoax" not in title.lower():
                continue

            if href.startswith("/"):
                href = "https://www.antaranews.com" + href
            #after url normlization and before storing check if url is valid!
            if not is_valid_article_url(href, "antaranews.com"):
                continue

            key = (title, href)
            if key in seen:
                continue

            seen.add(key)

            results.append({
                "source": "Antara Anti-Hoax",
                "title": title,
                "url": href,
                "scraped_at": datetime.now().isoformat()
            })

        time.sleep(1)

    return results


if __name__ == "__main__":
    data = scrape_antaranews(pages=5)

    print("\nTOTAL ARTICLES:", len(data))
    for item in data:
        print(item)
