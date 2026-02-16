from builtins import len, print, range
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from urllib.parse import urljoin
import time
from dateutil import parser as date_parser

from scraper.utils import is_valid_article_url

BASE_URL = "https://hoaxornot.detik.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
}


def extract_published_date(article_url):
    """Extract published date from article detail page"""
    try:
        r = requests.get(article_url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return None
        
        soup = BeautifulSoup(r.text, "html.parser")
        
        # Try multiple common date selectors for Detik
        date_elem = None
        for selector in ['time', '[property="article:published_time"]', '.date', '.publish-date', 'span.date-publish', '.article-date']:
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


def deduplicate_by_url(items):
    seen = set()
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
            # after url normalization and before storing check if url is valid!
            # detik links often point to news.detik.com, sport.detik.com, etc. Accept detik.com
            if not is_valid_article_url(link, "detik.com"):
                continue
            
            # Extract published date
            published_date = extract_published_date(link)
            
            articles.append({
                "source": "Detik Hoax or Not",
                "title": title,
                "url": link,
                "published_at": published_date,
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
