from builtins import len, print
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
from dateutil import parser as date_parser

from scraper.utils import is_valid_article_url

SOURCE_NAME = "Tempo Hoax"
BASE_URL = "https://cekfakta.tempo.co/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def extract_published_date(article_url):
    """Extract published date from article detail page"""
    try:
        r = requests.get(article_url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Try multiple common date selectors
        date_elem = None
        for selector in ['time', 'span[data-datetime]', '[property="article:published_time"]', '.date', '.publish-date']:
            date_elem = soup.select_one(selector)
            if date_elem:
                break
        
        if not date_elem:
            return None
        
        # Check for datetime attribute first
        date_str = date_elem.get('datetime') or date_elem.get('content') or date_elem.get_text(strip=True)
        
        if not date_str:
            return None
        
        # Parse the date
        parsed_date = date_parser.parse(date_str)
        return parsed_date.isoformat()
    except Exception as e:
        print(f"Error extracting date from {article_url}: {e}")
        return None


def scrape_tempo_hoax(pages=3):
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
                href = "https://cekfakta.tempo.co" + href

            # after url normalization and before storing, check validity
            # Accept tempo.co and its subdomains (en.tempo.co, cekfakta.tempo.co)
            if not is_valid_article_url(href, "tempo.co"):
                continue
            
            key = (title, href)
            if key in seen:
                continue

            seen.add(key)
            
            # Extract published date
            published_date = extract_published_date(href)

            articles.append({
                "source": SOURCE_NAME,
                "title": title,
                "url": href,
                "published_at": published_date,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            })

        time.sleep(1)

    return articles


if __name__ == "__main__":
    results = scrape_tempo_hoax(pages=2)
    print(f"\nTOTAL ARTICLES: {len(results)}\n")
    for r in results:
        print(r)
