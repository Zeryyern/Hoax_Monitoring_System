from storage.storage import (
    init_db,
    migrate_add_content_hash,
    save_articles,
    log_run
)
from scraper.fetch import fetch_all


def main():
    init_db()
    migrate_add_content_hash()

    articles = fetch_all()
    total = len(articles)

    inserted = save_articles(articles)

    print(f"\nTOTAL ARTICLES COLLECTED: {total}")
    print(f"NEW ARTICLES INSERTED INTO DB: {inserted}")

    log_run(total, inserted, "SUCCESS")


if __name__ == "__main__":
    main()
