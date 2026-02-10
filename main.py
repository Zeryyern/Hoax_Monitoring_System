from storage.storage import init_db, save_articles
from scraper.fetch import fetch_all
from builtins import print, len


def main():
    init_db()

    articles = fetch_all()
    print(f"\nTOTAL ARTICLES COLLECTED: {len(articles)}")

    inserted = save_articles(articles)
    print(f"NEW ARTICLES INSERTED INTO DB: {inserted}")


if __name__ == "__main__":
    main()
