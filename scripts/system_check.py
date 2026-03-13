import os
import re
import sys

# Allow running this script from repo root.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import init_db, get_connection, list_from_rows
from claim_key import compute_claim_key


def _search_rows(conn, q: str, limit: int = 50):
    q = (q or "").strip()
    if not q:
        return []

    q_norm = re.sub(r"\s+", " ", q.strip().lower())
    q_like = f"%{q_norm}%"
    q_key = compute_claim_key(q)
    q_key_like = f"%{q_key}%" if q_key else q_like

    tokens = []
    if q_key:
        for tok in q_key.split():
            tok = tok.strip()
            if not tok:
                continue
            if len(tok) >= 3 or tok.isdigit():
                tokens.append(tok)
    tokens = tokens[:8]
    token_clause = ""
    token_params = []
    if tokens:
        token_clause = " OR (" + " AND ".join("claim_key LIKE ?" for _ in tokens) + ")"
        token_params = [f"%{t}%" for t in tokens]

    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT id, title, source, source_url, claim_key
        FROM news
        WHERE (LOWER(title) LIKE ? OR (claim_key IS NOT NULL AND claim_key <> '' AND claim_key LIKE ?) {token_clause})
        ORDER BY id DESC
        LIMIT ?
        """,
        (q_like, q_key_like, *token_params, int(limit)),
    )
    return list_from_rows(cur.fetchall())


def main() -> int:
    init_db()
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as c FROM news WHERE claim_key IS NULL OR TRIM(claim_key) = ''")
        missing = cur.fetchone()["c"]
        print(f"[DB] Missing claim_key rows: {missing}")

        cur.execute(
            """
            SELECT id, title, source, published_at_source, created_at
            FROM news
            WHERE title IS NOT NULL AND TRIM(title) <> ''
            ORDER BY id DESC
            LIMIT 10
            """
        )
        sample = list_from_rows(cur.fetchall())
        print(f"[DB] Sample rows: {len(sample)}")

        failures = 0
        for row in sample:
            title = (row.get("title") or "").strip()
            matches = _search_rows(conn, title, limit=10)
            ok = len(matches) > 0
            if not ok:
                failures += 1
            print(f"[SEARCH] title_len={len(title)} matches={len(matches)} ok={ok} title={title[:70]!r}")

        print(f"[RESULT] Search self-check failures: {failures}/{len(sample)}")
        return 0 if failures == 0 else 2
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())

