from builtins import len, print, range
import requests # pyright: ignore[reportMissingModuleSource]
from bs4 import BeautifulSoup # type: ignore
from datetime import datetime, timezone
from urllib.parse import urljoin
import time

BASE_URL = "https://hoaxornot.detik.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
}
def deduplicate_by_url(items):
    seen = set() # type: ignore
    unique = []

    for item in items:
        url = item.get("url")
        if url and url not in seen:
            seen.add(url)
            unique.append(item)

    return unique

def scrape_detik_hoax(pages=5):
    articles = []

    for page in range(1, pages + 1):
        url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        r = requests.get(url, headers=HEADERS, timeout=20)

        print(f"STATUS page {page}: {r.status_code}")

        if r.status_code != 200:
            continue

        soup = BeautifulSoup(r.text, "html.parser")

        for art in soup.select("article"):
            a = art.find("a", href=True)
            if not a:
                continue

            title = a.get_text(strip=True)
            link = urljoin(BASE_URL, a["href"])

            if len(title) < 25:
                continue

            articles.append({
                "source": "Detik Hoax or Not",
                "title": title,
                "url": link,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            })

        time.sleep(1.5)

    articles = deduplicate_by_url(articles)
    return articles


if __name__ == "__main__":
    data = scrape_detik_hoax(pages=3)

    print(f"\nTOTAL ARTICLES: {len(data)}\n")
    for d in data:
        print(d)
