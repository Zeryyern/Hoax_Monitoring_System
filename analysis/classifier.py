def classify_article(text: str) -> str:
    """
    Simple rule-based category classifier.
    Returns one category label as string.
    """

    text = text.lower()

    categories = {
        "politics": [
            "government", "president", "election", "minister",
            "parliament", "policy", "vote", "law"
        ],
        "health": [
            "virus", "covid", "vaccine", "hospital",
            "doctor", "health", "disease", "medical"
        ],
        "technology": [
            "ai", "technology", "software", "cyber",
            "internet", "application", "digital", "data"
        ],
        "economy": [
            "economy", "market", "bank", "finance",
            "money", "investment", "stock", "inflation"
        ]
    }

    scores = {category: 0 for category in categories}

    for category, keywords in categories.items():
        for word in keywords:
            if word in text:
                scores[category] += 1

    # Get category with highest score
    best_category = max(scores, key=scores.get)

    # If no keywords matched
    if scores[best_category] == 0:
        return "general"

    return best_category
