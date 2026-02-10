from builtins import RuntimeError, int, len, print, str
import feedparser # type: ignore
from datetime import datetime, timezone
import re

RSS_URL = (
    "https://news.google.com/rss/search?"
    "q=site:tempo.co+hoax&hl=id&gl=ID&ceid=ID:id"
)


def clean_text(text: str) -> str:
    """Remove HTML tags and extra spaces."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    return " ".join(text.split())


def scrape_tempo_hoax(limit: int = 20):
    feed = feedparser.parse(RSS_URL)
    results = []

    for entry in feed.entries[:limit]:
        published = entry.get("published_parsed")

        if published:
            dt = datetime(*published[:6], tzinfo=timezone.utc)
            published_date = dt.date().isoformat()
            published_time = dt.time().isoformat()
        else:
            published_date = ""
            published_time = ""

        results.append({
            "source": "Tempo Hoax",
            "title": clean_text(entry.get("title", "")),
            "url": entry.get("link", ""),
            "published_date": published_date,
            "published_time": published_time,
            "summary": clean_text(entry.get("summary", "")),
            "scraped_at": datetime.now(timezone.utc).isoformat()
        })

    return results


if __name__ == "__main__":
    articles = scrape_tempo_hoax(limit=25)

    print(f"TOTAL ARTICLES: {len(articles)}\n")
    for a in articles:
        print(a)
