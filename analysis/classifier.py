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

# ---------------------------------------------------------
# HOAX DETECTION PATTERNS
# ---------------------------------------------------------

HOAX_INDICATORS = {
    "sensationalist_language": [
        "shocking", "unbelievable", "incredible", "outrageous",
        "URGENT", "ALERT", "BREAKING", "guncangan", "guncang",
        "mengejutkan", "tidak percaya", "luar biasa", "mengerikan"
    ],
    "conspiracy_markers": [
        "conspir", "cover-up", "hidden", "secret government",
        "big pharma", "illuminati", "deep state", "shadow",
        "konspirasi", "tutup-tutupi", "rahasia", "pemerintah tersembunyi"
    ],
    "unverified_claims": [
        "allegedly", "rumor", "supposedly", "claimed",
        "diberitakan", "dituduhkan", "konon", "katanya"
    ],
    "misinformation_markers": [
        "fake", "hoax", "false", "misleading",
        "palsu", "bohong", "menyesatkan", "tidak benar"
    ]
}

LEGITIMACY_INDICATORS = {
    "credible_sources": [
        "reuters", "bbc", "cnn", "ap news", "associated press",
        "badan pers", "kementerian", "resmi", "official",
        "pernyataan resmi", "sumber terpercaya", "menurut pakar"
    ],
    "verifiable_language": [
        "confirmed", "verified", "according", "evidence",
        "data", "study", "research", "findings",
        "terkonfirmasi", "terbukti", "menurut", "bukti", "data"
    ],
    "date_specific": [
        "today", "yesterday", "yesterday's", "specific dates",
        "hari ini", "kemarin", "tanggal"
    ]
}

# Conservative thresholds to reduce false "Legitimate" outcomes.
# If signal is weak/ambiguous, classify as Hoax with lower confidence.
HOAX_DECISION_THRESHOLD = 0.45
AMBIGUOUS_BAND_MIN = 0.40
AMBIGUOUS_BAND_MAX = 0.60


def detect_hoax_signal(text: str) -> tuple:
    """
    Detect hoax indicators in text.
    Returns (hoax_score, legitimacy_score, hoax_count, legit_count)
    hoax_score and legitimacy_score are between 0 and 1
    """
    tokens = tokenize(text)
    text_lower = text.lower()
    
    hoax_count = 0
    legit_count = 0
    
    # Count hoax indicators
    for category, keywords in HOAX_INDICATORS.items():
        for keyword in keywords:
            hoax_count += text_lower.count(keyword.lower())
    
    # Count legitimacy indicators
    for category, keywords in LEGITIMACY_INDICATORS.items():
        for keyword in keywords:
            legit_count += text_lower.count(keyword.lower())
    
    # Calculate scores (normalized)
    total_words = len(tokens)
    if total_words == 0:
        return 0.5, 0.5, hoax_count, legit_count
    
    # Normalize scores
    hoax_score = min(hoax_count / max(1, total_words / 10), 1.0)
    legit_score = min(legit_count / max(1, total_words / 10), 1.0)
    
    return hoax_score, legit_score, hoax_count, legit_count


def classify_article(text: str) -> tuple:
    """
    Enhanced classifier with confidence scoring.
    
    Returns: (prediction, confidence)
    - prediction: 'Hoax' or 'Legitimate'
    - confidence: float between 0.0 and 1.0
    """
    if not text or len(text.strip()) < 20:
        # Too short to verify safely: avoid returning Legitimate.
        return 'Hoax', 0.4
    
    hoax_score, legit_score, hoax_count, legit_count = detect_hoax_signal(text)
    
    # Calculate category-based score
    tokens = tokenize(text)
    token_counts = Counter(tokens)
    
    category_scores: Dict[str, int] = {}
    for category, config in CATEGORIES.items():
        raw_score = sum(token_counts.get(word, 0) for word in config["keywords"])
        weighted_score = raw_score * config["weight"]
        category_scores[category] = weighted_score
    
    # Get top category
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)
        category_weight = category_scores[best_category] / max(1, sum(category_scores.values()))
    else:
        best_category = 'other'
        category_weight = 0.0
    
    # Combine signals for final decision
    # 60% hoax/legit signals, 20% category detection, 20% keyword balance
    hoax_signal_weight = 0.6
    category_weight_multiplier = 0.2
    balance_weight = 0.2
    
    # Calculate balance (favor legit sources)
    legit_advantage = legit_score - hoax_score
    balance_score = (legit_advantage + 1) / 2  # Normalize to 0-1
    
    final_hoax_score = (
        hoax_score * hoax_signal_weight +
        (0.7 if best_category in ['politics', 'disaster'] else 0.3) * category_weight_multiplier +
        (1 - balance_score) * balance_weight
    )
    
    # Determine prediction (conservative policy):
    # - classify Hoax at lower threshold
    # - treat ambiguous middle band as Hoax with lower confidence
    if AMBIGUOUS_BAND_MIN <= final_hoax_score <= AMBIGUOUS_BAND_MAX:
        prediction = 'Hoax'
        confidence = max(0.45, min(final_hoax_score, 0.7))
    elif final_hoax_score >= HOAX_DECISION_THRESHOLD:
        prediction = 'Hoax'
        confidence = min(final_hoax_score, 0.99)
    else:
        prediction = 'Legitimate'
        confidence = min(1 - final_hoax_score, 0.99)
    
    # Confidence floor: if signals are weak, lower confidence
    total_signals = hoax_count + legit_count
    if total_signals < 2:
        prediction = 'Hoax'
        confidence = 0.45

    # Explicit misinformation keywords should force Hoax unless confidence is very strong otherwise.
    explicit_hoax_terms = [
        "hoax", "palsu", "bohong", "false", "fake", "disinformasi",
        "misinformasi", "menyesatkan", "tidak benar", "cek fakta"
    ]
    text_lower = text.lower()
    if any(term in text_lower for term in explicit_hoax_terms):
        prediction = 'Hoax'
        confidence = max(confidence, 0.65)

    return prediction, round(confidence, 3)
