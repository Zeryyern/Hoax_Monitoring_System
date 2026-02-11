from storage.storage import init_db, migrate_add_content_hash, save_articles 
from scraper.fetch import fetch_all

def main():
    init_db()
    migrate_add_content_hash()
    articles = fetch_all()
    print(f"\nTOTAL ARTICLES COLLECTED: {len(articles)}")

    inserted = save_articles(articles)
    print(f"NEW ARTICLES INSERTED INTO DB: {inserted}")


if __name__ == "__main__":
    main()
