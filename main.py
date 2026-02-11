from storage.storage import (
    init_db,
    migrate_add_content_hash,
    save_articles,
    log_run,
    get_total_articles,
    get_articles_per_source,
    get_recent_runs
)

from scraper.fetch import fetch_all


def main():
    # Initialize system
    init_db()
    migrate_add_content_hash()

    # Fetch data
    articles = fetch_all()
    total = len(articles)

    # Save to DB
    inserted = save_articles(articles)

    print(f"\nTOTAL ARTICLES COLLECTED: {total}")
    print(f"NEW ARTICLES INSERTED INTO DB: {inserted}")

    # Log system run
    log_run(total, inserted, "SUCCESS")

    # Analytics
    print("\n=== DATABASE ANALYTICS ===")

    print("\nTotal Stored Articles:", get_total_articles())

    print("\nArticles per Source:")
    for source, count in get_articles_per_source():
        print(f" - {source}: {count}")

    print("\nRecent Runs:")
    for run in get_recent_runs():
        print(
            f" - Time: {run['run_time']}, "
            f"Collected: {run['total_collected']}, "
            f"Inserted: {run['new_inserted']}, "
            f"Status: {run['status']}"
        )


if __name__ == "__main__":
    main()
