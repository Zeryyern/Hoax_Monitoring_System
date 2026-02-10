from builtins import len, print
from scraper.fetch import fetch_all

if __name__ == "__main__":
    data = fetch_all()
    print(f"TOTAL ARTICLES: {len(data)}")
