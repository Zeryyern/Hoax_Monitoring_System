import requests
from bs4 import BeautifulSoup
from storage.storage import (
    get_articles_without_content,
    update_article_content
)
from analysis.text_cleaner import clean_text
from analysis.nlp_processor import process_text
from analysis.keyword_extractor import extract_keywords
def extract_main_text(url: str) -> str:
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        final_url = response.url # after redirects
        soup = BeautifulSoup(response.text, "html.parser")

        paragraphs = soup.find_all("p")
        text = " ".join(p.get_text(strip=True) for p in paragraphs)
        if len(text) < 200:
            print(f"[WARNING] extracted content too short from {final_url}")
            return None
        
        return text.strip()

    except Exception as e:
        print(f"[EXTRACTION ERROR] {url} → {e}")
        return None

def process_articles(limit: int = 10):
    articles = get_articles_without_content(limit)

    if not articles:
        print("[INFO] No articles to process.")
        return

    for article in articles:
        article_id = article["id"]
        url = article["url"]

        print(f"[PROCESSING] {url}")

        content = extract_main_text(url)

        if content:
            #=== PHASE 2: NLP PROCESSING ===#
            cleaned_content = clean_text(content)
            tokens = process_text(cleaned_content)
            keywords = extract_keywords(tokens)
            
            word_count = len(tokens)
            unique_words_count = len(set(tokens))
            print(f"[NLP] Word Count: {word_count}")
            print(f"[NLP] Unique words: {unique_words_count}")
            print(f"[NLP] Keywords: {keywords[:5]}")
            
            #Save cleaned content to DB
            update_article_content(article_id, cleaned_content)
            
            print(f"[SUCCESS] Content Saved with NLP Processing.")   
        else:
            print("[FAILED] No content extracted.")
