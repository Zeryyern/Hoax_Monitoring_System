from collections import Counter

def extract_keywords(tokens, top_n=10):
    counter = Counter(tokens)
    return counter.most_common(top_n)
