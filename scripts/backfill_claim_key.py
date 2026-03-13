import os
import sys

# Allow running this script from repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_connection, init_db

try:
    from claim_key import compute_claim_key
except Exception:
    def compute_claim_key(title: str) -> str:
        return ""


def main() -> int:
    # Ensure schema migrations have run (claim_key column/index).
    init_db()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, title, claim_key
        FROM news
        ORDER BY id ASC
        """
    )
    rows = cur.fetchall()
    updated = 0

    try:
        for row in rows:
            news_id = row["id"]
            title = (row["title"] or "").strip()
            key = compute_claim_key(title)
            if not key:
                continue
            existing = (row["claim_key"] or "").strip()
            if existing == key:
                continue
            cur.execute(
                "UPDATE news SET claim_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (key, news_id),
            )
            updated += 1
        conn.commit()
    finally:
        conn.close()

    print(f"Recomputed claim_key for {updated} rows (of {len(rows)} checked).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
