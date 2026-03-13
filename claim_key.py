import re


_TRAILING_NUMERIC_ID_RE = re.compile(r"\s+\d{5,}\s*$")
_LEADING_BRACKET_TAG_RE = re.compile(r"^\s*\[[^\]]{1,40}\]\s*", re.IGNORECASE)
_MULTISPACE_RE = re.compile(r"\s+")
_NON_WORD_RE = re.compile(r"[^\w]+", re.UNICODE)


def normalize_title_for_storage(title: str) -> str:
    """
    Lightweight normalization for storing/displaying titles.
    This intentionally avoids aggressive stopword removal to prevent mangling.
    """
    if not title:
        return ""
    cleaned = str(title).replace("|", " ").replace("â€¢", " ")
    cleaned = _TRAILING_NUMERIC_ID_RE.sub("", cleaned)  # Tempo sometimes appends long numeric IDs.
    cleaned = _MULTISPACE_RE.sub(" ", cleaned).strip(" -:;,.")
    return cleaned


def infer_prediction_from_title(title: str) -> str | None:
    """
    Best-effort verdict inference from common fact-check prefixes.
    Returns: "Hoax", "Legitimate", or None (unknown).
    """
    if not title:
        return None

    raw = str(title).strip()
    lowered = raw.lower()

    # Prefer explicit bracket tags: [HOAKS], [SALAH], [FAKTA], [BENAR], etc.
    # We only inspect the leading tags to reduce false positives.
    lead = raw
    for _ in range(3):
        m = _LEADING_BRACKET_TAG_RE.match(lead)
        if not m:
            break
        tag = m.group(0).strip(" []\t\r\n").lower()
        if any(k in tag for k in ("hoaks", "hoax", "salah", "misinformasi", "disinformasi", "keliru", "palsu", "fitnah")):
            return "Hoax"
        if any(k in tag for k in ("fakta", "benar", "valid", "true")):
            return "Legitimate"
        lead = lead[m.end():]

    # Fallback: common leading tokens without brackets (conservative).
    if lowered.startswith(("hoaks", "hoax")):
        return "Hoax"
    if lowered.startswith(("fakta", "benar")):
        return "Legitimate"

    return None


def compute_claim_key(title: str) -> str:
    """
    Normalize a title into a stable grouping key so the same claim can be matched
    across multiple sources.
    """
    if not title:
        return ""

    t = normalize_title_for_storage(title)

    # Strip repeated leading bracket tags: [HOAKS] [SALAH] [FAKTA] ...
    for _ in range(3):
        if not _LEADING_BRACKET_TAG_RE.match(t):
            break
        t = _LEADING_BRACKET_TAG_RE.sub("", t, count=1).strip()

    # Remove common leading boilerplate words.
    lowered = t.casefold().strip()
    lowered = re.sub(r"^(cek\s*fakta|fact\s*check)\s*[:\-]\s*", "", lowered)
    lowered = re.sub(r"^(hoaks?|hoax)\s*[:\-]\s*", "", lowered)
    lowered = re.sub(r"^(klarifikasi)\s*[:\-]\s*", "", lowered)
    lowered = re.sub(r"^(fakta|benar)\s*[:\-]\s*", "", lowered)

    # Keep alnum only so similar punctuation does not split groups.
    # Keep unicode letters/digits to support Indonesian and mixed-language titles.
    lowered = _NON_WORD_RE.sub(" ", lowered)
    lowered = lowered.replace("_", " ")
    lowered = _MULTISPACE_RE.sub(" ", lowered).strip()

    return lowered
