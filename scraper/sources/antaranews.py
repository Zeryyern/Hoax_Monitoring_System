from builtins import len, print, range, set
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
from dateutil import parser as date_parser
from requests.exceptions import RequestException, Timeout, ConnectionError

from scraper.utils import is_valid_article_url

BASE_URL = "https://www.antaranews.com/slug/anti-hoax"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def extract_published_date(article_url, timeout=8):
    """
    Extract published date from article detail page
    Returns None if extraction fails or times out
    """
    try:
        response = requests.get(article_url, headers=HEADERS, timeout=timeout)
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Try multiple common date selectors for Antara
        date_elem = None
        for selector in ['time', '[property="article:published_time"]', '.article-date', '.publish-date', 'span.updated', 'span.date']:
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
        
    except (Timeout, ConnectionError):
        # Silently skip on timeout - don't print/log individual article failures
        return None
    except Exception:
        # Silently skip on any other error
        return None


def scrape_antaranews(pages=5):
    results = []
    seen = set()

    for page in range(1, pages + 1):
        try:
            url = f"{BASE_URL}?page={page}"
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

                # strict anti-hoax filtering
                if "/berita/" not in href:
                    continue

                if "hoaks" not in title.lower() and "hoax" not in title.lower():
                    continue

                if href.startswith("/"):
                    href = "https://www.antaranews.com" + href
                # after url normalization and before storing check if url is valid!
                if not is_valid_article_url(href, "antaranews.com"):
                    continue

                key = (title, href)
                if key in seen:
                    continue

                seen.add(key)
                
                # Extract published date (silently fails if timeout/error)
                published_date = extract_published_date(href)

                results.append({
                    "source": "Antara Anti-Hoax",
                    "title": title,
                    "url": href,
                    "published_at": published_date,
                    "scraped_at": datetime.now(timezone.utc).isoformat()
                })

            time.sleep(1)

        except RequestException:
            # If main page request fails, skip to next page
            continue
        except Exception:
            # Catch any unexpected errors and continue
            continue

    return results


if __name__ == "__main__":
    data = scrape_antaranews(pages=5)

    print("\nTOTAL ARTICLES:", len(data))
    for item in data:
        print(item)
