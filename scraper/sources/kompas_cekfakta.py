from builtins import RuntimeError, hasattr, len, print
import feedparser # type: ignore
from datetime import datetime, timezone

SOURCE_NAME = "Kompas Cek Fakta"

RSS_URL = (
    "https://news.google.com/rss/search?"
    "q=site:cekfakta.kompas.com+(hoaks+OR+fakta)"
    "&hl=id&gl=ID&ceid=ID:id"
)

def scrape_kompas_cekfakta():
    feed = feedparser.parse(RSS_URL)
    articles = []

    for entry in feed.entries:
        published_date = None
        published_time = None

        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            published_date = dt.date().isoformat()
            published_time = dt.time().isoformat()

        articles.append({
            "source": SOURCE_NAME,
            "title": entry.title,
            "url": entry.link,
            "published_date": published_date,
            "published_time": published_time,
            "summary": entry.summary if hasattr(entry, "summary") else "",
            "scraped_at": datetime.now(timezone.utc).isoformat()
        })

    return articles


if __name__ == "__main__":
    results = scrape_kompas_cekfakta()
    print(f"TOTAL ARTICLES: {len(results)}\n")
    for r in results:
        print(r)
