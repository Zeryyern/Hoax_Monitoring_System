import sqlite3
from pathlib import Path


def main() -> int:
    db_path = Path(__file__).resolve().parents[1] / "data" / "hoax.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) as c FROM news")
    before = int(cur.fetchone()["c"] or 0)

    # Remove Kompas navigation/footer links that were mistakenly scraped as articles.
    bad_titles = ("artikel headline", "topik pilihan", "artikel terpopuler", "parapuan")
    cur.execute(
        f"""
        DELETE FROM news
        WHERE LOWER(TRIM(source)) LIKE '%kompas%'
          AND (
            LOWER(TRIM(title)) IN ({", ".join("?" for _ in bad_titles)})
            OR source_url LIKE 'https://indeks.kompas.com/%'
            OR source_url LIKE 'https://www.kompas.com/parapuan%'
            OR source_url LIKE 'https://account.kompas.com/login%'
          )
        """,
        bad_titles,
    )
    removed = cur.rowcount
    conn.commit()

    cur.execute("SELECT COUNT(*) as c FROM news")
    after = int(cur.fetchone()["c"] or 0)
    conn.close()

    print(f"db={db_path}")
    print(f"news_before={before}")
    print(f"news_removed={removed}")
    print(f"news_after={after}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

