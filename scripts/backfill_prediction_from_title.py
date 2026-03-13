import os
import sys

# Allow running this script from repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_connection, init_db

try:
    from claim_key import infer_prediction_from_title
except Exception:
    def infer_prediction_from_title(title: str):
        return None


def main() -> int:
    init_db()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, title, prediction
        FROM news
        WHERE title IS NOT NULL AND TRIM(title) <> ''
        ORDER BY id ASC
        """
    )
    rows = cur.fetchall()

    updated = 0
    try:
        for row in rows:
            news_id = row["id"]
            title = (row["title"] or "").strip()
            inferred = infer_prediction_from_title(title)
            if not inferred:
                continue
            current = (row["prediction"] or "").strip()
            if current == inferred:
                continue
            cur.execute(
                "UPDATE news SET prediction = ?, confidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (inferred, 1.0, news_id),
            )
            updated += 1
        conn.commit()
    finally:
        conn.close()

    print(f"Backfilled prediction from title tags for {updated} rows (of {len(rows)} checked).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

