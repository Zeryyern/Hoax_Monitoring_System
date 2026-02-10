from builtins import hasattr, len, print
import feedparser # type: ignore
from datetime import datetime
from typing import List, Dict

SOURCE_NAME = "TurnBackHoax"

FEED_URL = (
    "https://news.google.com/rss/search?"
    "q=site:turnbackhoax.id+hoax&hl=id&gl=ID&ceid=ID:id"
)

def fetch_turnbackhoax() -> List[Dict]:
    """
    Fetch hoax-related articles from TurnBackHoax via Google News RSS.
    This approach is used because direct scraping is blocked (502 / anti-bot).
    """

    feed = feedparser.parse(FEED_URL)
    articles = []

    for entry in feed.entries:
        published_date = ""
        published_time = ""

        if hasattr(entry, "published_parsed") and entry.published_parsed:
            dt = datetime(*entry.published_parsed[:6])
            published_date = dt.strftime("%Y-%m-%d")
            published_time = dt.strftime("%H:%M:%S")

        articles.append({
            "source": SOURCE_NAME,
            "title": entry.get("title", "").strip(),
            "url": entry.get("link"),
            "published_date": published_date,
            "published_time": published_time,
            "summary": entry.get("summary", "").strip()
        })

    return articles


# Allow standalone testing
if __name__ == "__main__":
    data = fetch_turnbackhoax()
    print(f"TOTAL ARTICLES: {len(data)}\n")

    for item in data[:5]:
        print(item)
