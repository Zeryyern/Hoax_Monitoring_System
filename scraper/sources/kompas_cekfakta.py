from builtins import len, print
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import time

from scraper.utils import (
    is_valid_article_url,
    extract_next_page_url,
    collect_entries_from_sitemaps,
    discover_sitemaps_from_robots,
)

SOURCE_NAME = "Kompas Cek Fakta"
BASE_URL = "https://cekfakta.kompas.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}


def title_from_url(url: str) -> str:
    slug = url.rstrip("/").split("/")[-1]
    return slug.replace("-", " ").strip()


def scrape_kompas_cekfakta(pages=None, max_pages=100000):
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True
    articles = []
    seen = set()
    page = 1
    current_url = BASE_URL
    visited_listing_urls = set()
    consecutive_empty_pages = 0

    if pages is None:
        robots_seeds = discover_sitemaps_from_robots(
            "https://cekfakta.kompas.com/robots.txt",
            session=session,
            required_domain="kompas.com",
        )
        sitemap_entries = collect_entries_from_sitemaps(
            robots_seeds + [
                "https://cekfakta.kompas.com/sitemap.xml",
                "https://cekfakta.kompas.com/sitemap_index.xml",
                "https://cekfakta.kompas.com/post-sitemap.xml",
            ],
            session=session,
            required_domain="kompas.com",
            url_filter=lambda u: is_valid_article_url(u, "kompas.com"),
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

        r = session.get(current_url, timeout=20)

        print(f"STATUS page {page}: {r.status_code}")

        if r.status_code != 200:
            page += 1
            current_url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        before_count = len(articles)

        for a in soup.find_all("a", href=True):
            href = a["href"]
            title = a.get_text(strip=True)

            if href.startswith("/"):
                href = "https://cekfakta.kompas.com" + href
                
            # after url normalization and before storing check if url is valid!
            # Allow kompas.com domain variants (www.kompas.com, cekfakta.kompas.com)
            if not is_valid_article_url(href, "kompas.com"):
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

        next_url = None
        if pages is None:
            next_url = extract_next_page_url(soup, current_url, "kompas.com")

        page += 1
        if pages is not None:
            current_url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        else:
            current_url = next_url or (BASE_URL if page == 1 else f"{BASE_URL}?page={page}")

    return articles


if __name__ == "__main__":
    results = scrape_kompas_cekfakta(pages=2)
    print(f"\nTOTAL ARTICLES: {len(results)}\n")
    for r in results:
        print(r)
