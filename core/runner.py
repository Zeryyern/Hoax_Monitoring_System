from storage.storage import (
    init_db,
    migrate_add_content_column,
    migrate_add_content_hash,
    migrate_add_nlp_columns,
    migrate_add_category_column,
    save_articles,
    log_run,
    get_total_articles,
    get_articles_per_source,
    get_recent_runs,
    get_top_keywords
)

from processor.content_extractor import process_articles
from scraper.fetch import fetch_all
from logger import logger


def run_once():
    logger.info("System run started")

    try:
        # Initialize system
        init_db()
        migrate_add_content_column()
        migrate_add_content_hash()
        migrate_add_nlp_columns()
        migrate_add_category_column()

        # Fetch data
        articles = fetch_all()
        total = len(articles)

        # Save to DB
        inserted = save_articles(articles)

        logger.info(f"TOTAL ARTICLES COLLECTED: {total}")
        logger.info(f"NEW ARTICLES INSERTED INTO DB: {inserted}")

        # Log system run
        log_run(total, inserted, "SUCCESS")

        # Analytics
        logger.info("=== DATABASE ANALYTICS ===")
        logger.info(f"Total Stored Articles: {get_total_articles()}")

        logger.info("Articles per Source:")
        for source, count in get_articles_per_source():
            logger.info(f"{source}: {count}")

        logger.info("Recent Runs:")
        for run in get_recent_runs():
            logger.info(
                f"Time: {run['run_time']} | "
                f"Collected: {run['total_collected']} | "
                f"Inserted: {run['new_inserted']} | "
                f"Status: {run['status']}"
            )

        #analytics output
        logger.info("TOP GLOBAL KEYWORDS")
        for word, count in get_top_keywords(15):
            logger.info(f"{word}: {count}")
        
        # Process article contents
        logger.info("=== PROCESSING ARTICLE CONTENTS ===")
        process_articles(limit=5)

        logger.info("System run completed successfully")

    except Exception as e:
        logger.error(f"System run failed: {str(e)}")
        log_run(0, 0, "FAILED")
