import sys
import traceback
from dataclasses import dataclass
from typing import Callable, Optional


sys.path.insert(0, "Hoax_Monitoring")

from scraper.fetch import normalize_and_filter  # noqa: E402


@dataclass
class AuditResult:
    source: str
    raw_count: int
    cleaned_count: int
    error: Optional[str]
    sample_titles: list[str]


def _run_source(source_name: str, fn: Callable[[], list[dict]]) -> AuditResult:
    try:
        raw_items = fn() or []
        raw_count = len(raw_items)
        cleaned = normalize_and_filter(raw_items, source_name) or []
        cleaned_count = len(cleaned)
        sample_titles = [str(item.get("title") or "").strip() for item in cleaned[:5] if item.get("title")]
        return AuditResult(
            source=source_name,
            raw_count=raw_count,
            cleaned_count=cleaned_count,
            error=None,
            sample_titles=sample_titles,
        )
    except Exception as e:
        return AuditResult(
            source=source_name,
            raw_count=0,
            cleaned_count=0,
            error=f"{type(e).__name__}: {e}",
            sample_titles=[],
        )


def main() -> int:
    from scraper.sources.antaranews import scrape_antaranews
    from scraper.sources.kompas_cekfakta import scrape_kompas_cekfakta
    from scraper.sources.detik_hoax import scrape_detik_hoax
    from scraper.sources.tempo_hoax import scrape_tempo_hoax
    from scraper.sources.turnbackhoax import scrape_turnbackhoax

    sources: list[tuple[str, Callable[[], list[dict]]]] = [
        ("TurnBackHoax", lambda: scrape_turnbackhoax(pages=1)),
        ("Antara Anti-Hoax", lambda: scrape_antaranews(pages=1)),
        ("Kompas Cek Fakta", lambda: scrape_kompas_cekfakta(pages=1)),
        ("Detik Hoax or Not", lambda: scrape_detik_hoax(pages=1)),
        ("Tempo Hoax", lambda: scrape_tempo_hoax(pages=1)),
    ]

    results: list[AuditResult] = []
    for name, fn in sources:
        results.append(_run_source(name, fn))

    print("SCRAPER AUDIT (small mode)")
    for r in results:
        status = "OK" if not r.error else "ERROR"
        print(f"- {r.source}: {status} raw={r.raw_count} cleaned={r.cleaned_count}")
        if r.error:
            print(f"  error={r.error}")
        if r.sample_titles:
            print(f"  samples={'; '.join(r.sample_titles[:3])}")

    # Non-zero exit if any scraper failed.
    failed = [r for r in results if r.error]
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc()
        raise SystemExit(2)

