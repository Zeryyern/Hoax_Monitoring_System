from builtins import len, print
from scraper.fetch import fetch_all

if __name__ == "__main__":
    articles, status = fetch_all()
    print("\n === SOURCE STATUS === ")
    for src, info in status.items():
        print(src, "->", info)

    print(f"TOTAL ARTICLES COLLECTED: {len(articles)}")
