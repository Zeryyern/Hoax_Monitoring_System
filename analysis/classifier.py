import re
from collections import Counter
from typing import Dict, List

# ---------------------------------------------------------
# CONFIGURATION (Professional Separation of Concerns)
# ---------------------------------------------------------

STOPWORDS = {
    "dan", "di", "ke", "dari", "yang", "untuk", "pada",
    "the", "of", "to", "in", "a", "is", "are", "with"
}

CATEGORIES: Dict[str, Dict[str, List[str] or int]] = {
    "politics": {
        "keywords": [
            "jokowi", "presiden", "menteri", "dpr", "uu",
            "pemerintah", "pemilu", "politik", "partai",
            "kpk", "gubernur", "trump", "biden"
        ],
        "weight": 3
    },
    "health": {
        "keywords": [
            "virus", "covid", "vaksin", "rumah", "sakit",
            "dokter", "kesehatan", "pasien", "penyakit"
        ],
        "weight": 3
    },
    "economy": {
        "keywords": [
            "ekonomi", "pasar", "bank", "keuangan",
            "uang", "investasi", "saham", "inflasi",
            "msci", "market", "finance"
        ],
        "weight": 3
    },
    "law": {
        "keywords": [
            "hukum", "penganiayaan", "tersangka",
            "kasus", "polisi", "penjara",
            "sidang", "lapor", "ditahan"
        ],
        "weight": 3
    },
    "sports": {
        "keywords": [
            "ronaldo", "messi", "maradona",
            "sepakbola", "bola", "liga", "gol"
        ],
        "weight": 3
    },
    "disaster": {
        "keywords": [
            "gempa", "tsunami", "banjir",
            "longsor", "letusan", "erupsi",
            "tektonik", "korban", "jurang"
        ],
        "weight": 3
    },
    "technology": {
        "keywords": [
            "ai", "teknologi", "aplikasi",
            "internet", "digital", "cyber",
            "software"
        ],
        "weight": 1
    }
}

MIN_SCORE_THRESHOLD = 3  # Prevent weak accidental matches


# ---------------------------------------------------------
# TOKENIZATION
# ---------------------------------------------------------

def tokenize(text: str) -> List[str]:
    """
    Normalize and tokenize text:
    - Lowercase
    - Remove punctuation
    - Remove stopwords
    - Remove very short tokens
    """
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    tokens = text.split()

    cleaned = [
        token for token in tokens
        if token not in STOPWORDS and len(token) > 2
    ]

    return cleaned


# ---------------------------------------------------------
# CLASSIFIER
# ---------------------------------------------------------

def classify_article(text: str) -> str:
    """
    Professional rule-based news classifier.

    Strategy:
    - Tokenize and normalize text
    - Count keyword frequency
    - Apply category weights
    - Select highest scoring category
    - Apply threshold filtering
    - Resolve ties deterministically
    """

    tokens = tokenize(text)
    token_counts = Counter(tokens)

    scores: Dict[str, int] = {}

    for category, config in CATEGORIES.items():
        raw_score = sum(token_counts.get(word, 0) for word in config["keywords"])
        weighted_score = raw_score * config["weight"]
        scores[category] = weighted_score

    # Sort categories by score (descending)
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)

    best_category, best_score = sorted_scores[0]

    # If below threshold → classify as other
    if best_score < MIN_SCORE_THRESHOLD:
        return "other"

    # Handle tie cases (rare but important)
    top_categories = [cat for cat, score in sorted_scores if score == best_score]

    if len(top_categories) > 1:
        # deterministic tie breaker: alphabetical order
        return sorted(top_categories)[0]

    return best_category
