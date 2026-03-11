from builtins import len, print, range
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from urllib.parse import urljoin
import time





from scraper.utils import (
    is_valid_article_url,
    extract_next_page_url,
    collect_entries_from_sitemaps,
    discover_sitemaps_from_robots,
)

BASE_URL = "https://hoaxornot.detik.com/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8"
}


def title_from_url(url: str) -> str:
    slug = url.rstrip("/").split("/")[-1]
    return slug.replace("-", " ").strip()


def deduplicate_by_url(items):
    seen = set()
    unique = []

    for item in items:
        url = item.get("url")
        if url and url not in seen:
            seen.add(url)
            unique.append(item)

    return unique


def scrape_detik_hoax(pages=None, max_pages=100000):
    session = requests.Session()
    session.headers.update(HEADERS)
    session.verify = True
    articles = []
    seen_urls = set()
    page = 1
    current_url = BASE_URL
    visited_listing_urls = set()
    consecutive_empty_pages = 0

    # Deep archive mode: prefer sitemap crawl when full history is requested.
    if pages is None:
        robots_seeds = discover_sitemaps_from_robots(
            "https://hoaxornot.detik.com/robots.txt",
            session=session,
            required_domain="detik.com",
        )
        sitemap_entries = collect_entries_from_sitemaps(
            robots_seeds + [
                "https://hoaxornot.detik.com/sitemap.xml",
                "https://hoaxornot.detik.com/sitemap_index.xml",
                "https://hoaxornot.detik.com/post-sitemap.xml",
            ],
            session=session,
            required_domain="detik.com",
            url_filter=lambda u: "hoaxornot.detik.com" in u,
            max_urls_per_seed=300000,
            max_sitemaps_per_seed=30000,
        )
        for entry in sitemap_entries:
            link = entry["url"]
            if not link or link in seen_urls:
                continue
            seen_urls.add(link)
            fallback_title = title_from_url(link)
            fallback_lastmod = entry.get("lastmod")
            articles.append(
                {
                    "source": "Detik Hoax or Not",
                    "title": fallback_title,
                    "url": link,
                    "published_at": fallback_lastmod,
                    "scraped_at": datetime.now(timezone.utc).isoformat(),
                }
            )

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
            current_url = f"{BASE_URL}?page={page}"
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        before_count = len(articles)

        for art in soup.select("article"):
            a = art.find("a", href=True)
            if not a:
                continue

            title = a.get_text(strip=True)
            link = urljoin(BASE_URL, a["href"])

            # after url normalization and before storing check if url is valid!
            # detik links often point to news.detik.com, sport.detik.com, etc. Accept detik.com
            if not is_valid_article_url(link, "detik.com"):
                continue
            if not title:
                title = title_from_url(link)
            if not title:
                continue
            if link in seen_urls:
                continue
            seen_urls.add(link)
            
            articles.append({
                "source": "Detik Hoax or Not",
                "title": title,
                "url": link,
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
            next_url = extract_next_page_url(soup, current_url, "detik.com")

        page += 1
        if pages is not None:
            current_url = BASE_URL if page == 1 else f"{BASE_URL}?page={page}"
        else:
            current_url = next_url or f"{BASE_URL}?page={page}"

    articles = deduplicate_by_url(articles)
    return articles


if __name__ == "__main__":
    data = scrape_detik_hoax(pages=3)

    print(f"\nTOTAL ARTICLES: {len(data)}\n")
    for d in data:
        print(d)
