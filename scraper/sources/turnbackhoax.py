import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
from scraper.utils import is_valid_article_url

SOURCE_NAME = "TurnBackHoax"
BASE_URL = "https://turnbackhoax.id/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    "Connection": "keep-alive"
}


def scrape_turnbackhoax(pages=3):
    session = requests.Session()
    session.headers.update(HEADERS)

    articles = []
    seen = set()

    for page in range(1, pages + 1):
        url = BASE_URL if page == 1 else f"{BASE_URL}/page/{page}/"

        try:
            response = session.get(url, timeout=20)
            print(f"STATUS page {page}: {response.status_code}")
        except Exception as e:
            print("Request failed:", e)
            continue

        if response.status_code != 200:
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        for a in soup.find_all("a", href=True): 
            href = a["href"]
            title = a.get_text(strip=True)

            # Skip empty titles
            if not title:
                continue
            # Normalize relative URLs
            if href.startswith("/"):
                href = BASE_URL.rstrip("/") + href

            # 🔹 Filter invalid / non-article URLs
            if not is_valid_article_url(href, "turnbackhoax.id"):
                continue
            if "?" in href:
                continue
            if "/articles/" not in href:
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

        time.sleep(3)  # important for anti-bot safety

    return articles


if __name__ == "__main__":
    data = scrape_turnbackhoax(pages=2)
    print(f"\nTOTAL ARTICLES: {len(data)}")
    for item in data[:5]:
        print(item)
