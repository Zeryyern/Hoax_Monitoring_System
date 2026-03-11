from builtins import len, print, range, set
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
from requests.exceptions import RequestException

from scraper.utils import (
    is_valid_article_url,
    extract_next_page_url,
    collect_entries_from_sitemaps,
    discover_sitemaps_from_robots,
)

BASE_URL = "https://www.antaranews.com/slug/anti-hoax"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def scrape_antaranews(pages=None, max_pages=100000):
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True
    results = []
    seen_urls = set()
    page = 1
    current_url = f"{BASE_URL}?page=1"
    visited_listing_urls = set()
    consecutive_empty_pages = 0

    if pages is None:
        robots_seeds = discover_sitemaps_from_robots(
            "https://www.antaranews.com/robots.txt",
            session=session,
            required_domain="antaranews.com",
        )
        sitemap_entries = collect_entries_from_sitemaps(
            robots_seeds + [
                "https://www.antaranews.com/sitemap.xml",
                "https://www.antaranews.com/sitemap_index.xml",
                "https://www.antaranews.com/sitemap-news.xml",
                "https://www.antaranews.com/post-sitemap.xml",
            ],
            session=session,
            required_domain="antaranews.com",
            url_filter=lambda u: "/berita/" in u,
            max_urls_per_seed=300000,
            max_sitemaps_per_seed=30000,
        )
        for entry in sitemap_entries:
            href = entry["url"]
            if not href or href in seen_urls:
                continue
            seen_urls.add(href)
            published_date = entry.get("lastmod")
            title = href.rstrip("/").split("/")[-1].replace("-", " ").strip()
            results.append({
                "source": "Antara Anti-Hoax",
                "title": title,
                "url": href,
                "published_at": published_date,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            })

    while current_url:
        if page > int(max_pages):
            break
        if pages is not None and page > int(pages):
            break
        if current_url in visited_listing_urls:
            break
        visited_listing_urls.add(current_url)

        try:
            r = session.get(current_url, timeout=20)
            print(f"STATUS page {page}: {r.status_code}")

            if r.status_code != 200:
                page += 1
                current_url = f"{BASE_URL}?page={page}"
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            before_count = len(results)

            for a in soup.find_all("a", href=True):
                href = a["href"]
                title = a.get_text(strip=True)

                if "/berita/" not in href:
                    continue

                if href.startswith("/"):
                    href = "https://www.antaranews.com" + href
                # after url normalization and before storing check if url is valid!
                if not is_valid_article_url(href, "antaranews.com"):
                    continue

                if not title:
                    title = href.rstrip("/").split("/")[-1].replace("-", " ").strip()
                if not title:
                    continue

                if href in seen_urls:
                    continue

                seen_urls.add(href)
                
                results.append({
                    "source": "Antara Anti-Hoax",
                    "title": title,
                    "url": href,
                    "published_at": None,
                    "scraped_at": datetime.now(timezone.utc).isoformat()
                })

            added_count = len(results) - before_count
            if added_count == 0:
                consecutive_empty_pages += 1
            else:
                consecutive_empty_pages = 0

            time.sleep(0.2)

            if pages is None and consecutive_empty_pages >= 200:
                break

            next_url = None
            if pages is None:
                next_url = extract_next_page_url(soup, current_url, "antaranews.com")

            page += 1
            if pages is not None:
                current_url = f"{BASE_URL}?page={page}"
            else:
                current_url = next_url or f"{BASE_URL}?page={page}"

        except RequestException:
            # If main page request fails, skip to next page
            page += 1
            current_url = f"{BASE_URL}?page={page}"
            continue
        except Exception:
            # Catch any unexpected errors and continue
            page += 1
            current_url = f"{BASE_URL}?page={page}"
            continue

    return results


if __name__ == "__main__":
    data = scrape_antaranews(pages=5)

    print("\nTOTAL ARTICLES:", len(data))
    for item in data:
        print(item)
