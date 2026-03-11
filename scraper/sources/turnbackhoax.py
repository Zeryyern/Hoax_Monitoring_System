import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time
import re

from scraper.utils import (
    is_valid_article_url,
    collect_entries_from_sitemaps,
    discover_sitemaps_from_robots,
)

SOURCE_NAME = "TurnBackHoax"
BASE_URL = "https://turnbackhoax.id/"
ARTICLES_URL = "https://turnbackhoax.id/articles"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
    "Connection": "keep-alive"
}


def title_from_url(url: str) -> str:
    slug = url.rstrip("/").split("/")[-1]
    slug = re.sub(r"^\d+-", "", slug)
    return slug.replace("-", " ").strip()


def listing_url(page: int) -> str:
    if int(page) <= 1:
        return ARTICLES_URL
    return f"{ARTICLES_URL}?page={int(page)}"


def scrape_turnbackhoax(pages=None, max_pages=100000):
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True

    articles = []
    seen = set()
    page = 1
    current_url = listing_url(1)
    visited_listing_urls = set()
    consecutive_empty_pages = 0

    if pages is None:
        robots_seeds = discover_sitemaps_from_robots(
            "https://turnbackhoax.id/robots.txt",
            session=session,
            required_domain="turnbackhoax.id",
        )
        sitemap_entries = collect_entries_from_sitemaps(
            robots_seeds + [
                "https://turnbackhoax.id/sitemap.xml",
                "https://turnbackhoax.id/sitemap_index.xml",
                "https://turnbackhoax.id/post-sitemap.xml",
            ],
            session=session,
            required_domain="turnbackhoax.id",
            url_filter=lambda u: "/articles/" in u and "?" not in u,
            max_urls_per_seed=300000,
            max_sitemaps_per_seed=30000,
        )
        for entry in sitemap_entries:
            href = entry["url"]
            if not href or href in seen:
                continue
            seen.add(href)
            fallback_title = title_from_url(href)
            fallback_lastmod = entry.get("lastmod")
            articles.append({
                "source": SOURCE_NAME,
                "title": fallback_title,
                "url": href,
                "published_at": fallback_lastmod,
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
            response = session.get(current_url, timeout=20)
            print(f"STATUS page {page}: {response.status_code}")
        except Exception as e:
            print("Request failed:", e)
            page += 1
            current_url = listing_url(page)
            continue

        if response.status_code != 200:
            page += 1
            current_url = listing_url(page)
            continue

        soup = BeautifulSoup(response.text, "html.parser")
        before_count = len(articles)

        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(strip=True)

            if href.startswith("/"):
                href = BASE_URL.rstrip("/") + href

            if "/articles/" not in href:
                continue
            if "?" in href:
                continue
            if href.rstrip("/") == ARTICLES_URL:
                continue
            if not is_valid_article_url(href, "turnbackhoax.id"):
                continue

            if not title:
                title = title_from_url(href)
            if not title:
                continue

            if href in seen:
                continue
            seen.add(href)

            articles.append({
                "source": SOURCE_NAME,
                "title": title,
                "url": href,
                "published_at": None,
                "scraped_at": datetime.now(timezone.utc).isoformat()
            })

        added_count = len(articles) - before_count
        if added_count == 0:
            consecutive_empty_pages += 1
        else:
            consecutive_empty_pages = 0

        time.sleep(0.2)

        if pages is None and consecutive_empty_pages >= 200:
            break

        page += 1
        current_url = listing_url(page)

    return articles


if __name__ == "__main__":
    data = scrape_turnbackhoax(pages=2)
    print(f"\nTOTAL ARTICLES: {len(data)}")
    for item in data[:5]:
        print(item)
