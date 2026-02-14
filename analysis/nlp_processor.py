import re
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

# Initialize stemmer
factory = StemmerFactory()
stemmer = factory.create_stemmer()

# Initialize stopwords
stop_factory = StopWordRemoverFactory()
stopwords = set(stop_factory.get_stop_words())


def tokenize(text: str):
    text = text.lower()
    tokens = re.findall(r'\b[a-zA-Z]+\b', text)
    return tokens


def remove_stopwords(tokens):
    return [word for word in tokens if word not in stopwords]


def stem_tokens(tokens):
    return [stemmer.stem(word) for word in tokens]


def process_text(text: str):
    tokens = tokenize(text)
    tokens = remove_stopwords(tokens)
    tokens = stem_tokens(tokens)
    return tokens
