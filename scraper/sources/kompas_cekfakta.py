from builtins import len, print
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
from dateutil import parser as date_parser

from scraper.utils import is_valid_article_url

SOURCE_NAME = "Kompas Cek Fakta"
BASE_URL = "https://cekfakta.kompas.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def extract_published_date(article_url, session=None):
    """Extract published date from article detail page"""
    try:
        if session is None:
            session = requests.Session()
            session.verify = True
        r = session.get(article_url, timeout=10)
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Try multiple common date selectors for Kompas
        date_elem = None
        for selector in ['time', 'span[data-datetime]', '[property="article:published_time"]', '.date-publish', '.publish-date', 'span.publish-date']:
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


def scrape_kompas_cekfakta(pages=3):
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True
    articles = []
    seen = set()

    for page in range(1, pages + 1):
        url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        r = session.get(url, timeout=20)

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
                
            # after url normalization and before storing check if url is valid!
            # Allow kompas.com domain variants (www.kompas.com, cekfakta.kompas.com)
            if not is_valid_article_url(href, "kompas.com"):
                continue

            key = (title, href)
            if key in seen:
                continue

            seen.add(key), session
            
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
    results = scrape_kompas_cekfakta(pages=2)
    print(f"\nTOTAL ARTICLES: {len(results)}\n")
    for r in results:
        print(r)
