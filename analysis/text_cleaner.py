import re

def clean_text(text: str) -> str:
    """
    Basic normalization for Indonesian news articles.
    Removes excessive whitespace, artifacts, and normalizes formatting.
    """

    if not text:
        return ""

    # Remove HTML leftover tags (if any)
    text = re.sub(r"<.*?>", " ", text)

    # Remove multiple spaces/newlines
    text = re.sub(r"\s+", " ", text)

    # Remove non-printable characters
    text = re.sub(r"[^\x20-\x7E\u00A0-\uFFFF]", "", text)

    return text.strip()
