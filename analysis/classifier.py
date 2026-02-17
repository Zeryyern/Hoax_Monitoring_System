from collections import Counter

def classify_article(text: str) -> str:
    """
    Improved rule-based classifier for Indonesian news articles.
    Uses token-based scoring to avoid substring bias.
    """

    text = text.lower()
    tokens = text.split()
    token_counts = Counter(tokens)

    categories = {
        "politics": [
            "jokowi", "presiden", "menteri", "dpr", "uu",
            "pemerintah", "pemilu", "politik", "partai", "kpk"
        ],
        "health": [
            "virus", "covid", "vaksin", "rumah", "sakit",
            "dokter", "kesehatan", "pasien", "penyakit"
        ],
        "technology": [
            "ai", "teknologi", "aplikasi", "internet",
            "digital", "data", "cyber", "software"
        ],
        "economy": [
            "ekonomi", "pasar", "bank", "keuangan",
            "uang", "investasi", "saham", "inflasi", "msci"
        ],
        "sports": [
            "ronaldo", "messi", "maradona",
            "sepakbola", "bola", "liga", "gol"
        ],
        "law": [
            "hukum", "penganiayaan", "tersangka",
            "kasus", "polisi", "penjara", "sidang"
        ]
    }

    scores = {category: 0 for category in categories}

    for category, keywords in categories.items():
        for word in keywords:
            scores[category] += token_counts.get(word, 0)

    # Debug optional:
    # print("SCORES:", scores)

    best_category = max(scores, key=scores.get)

    # If all scores are zero → fallback
    if scores[best_category] == 0:
        return "other"

    return best_category
