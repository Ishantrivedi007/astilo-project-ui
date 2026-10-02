"""Nereus's local RAG knowledge base — real Wikipedia article text (via the
existing keyless app.cosmos.wikipedia adapter), chunked and indexed with a
plain TF-IDF + cosine-similarity retriever built on nothing but numpy.

Why TF-IDF instead of dense embeddings (FAISS/sentence-transformers, as the
original blueprint suggested): this machine's Ollama instance isn't running
with embeddings support, and sentence-transformers would pull in PyTorch as
a multi-gigabyte dependency. TF-IDF is weaker at semantic (paraphrase)
matching than dense embeddings, but it's real retrieval over real article
text, entirely local, with no new heavy dependencies and no changes to the
user's running Ollama service — consistent with "prefer local/open-source
software" and "no paid APIs" without over-reaching on footprint. Swapping in
dense embeddings later only requires replacing _vectorize()/retrieve(); the
on-disk format and the rest of Nereus are unaffected.

The index is persisted to ABYSS_KNOWLEDGE_BASE_DIR so it survives restarts
instead of re-hitting Wikipedia (and recomputing TF-IDF) every boot.
"""

import json
import math
import os
import re
from collections import Counter

import numpy as np

from app.config import config
from app.cosmos import wikipedia

# A deliberately curated set of real ocean-science topics — not an
# exhaustive encyclopedia, but enough breadth to ground Nereus's answers in
# real article text rather than its own training memory for the subjects
# Abyss actually covers.
TOPICS = [
    "Hydrothermal vent", "Coral reef", "Deep sea", "Ocean acidification",
    "Marine biodiversity", "Thermohaline circulation", "Oceanic trench",
    "Bioluminescence", "Phytoplankton", "Ocean current", "Coral bleaching",
    "Abyssal plain", "Mariana Trench", "Whale fall", "Chemosynthesis",
    "Marine protected area", "Upwelling", "Oxygen minimum zone",
    "Marine snow", "Zooplankton", "Cephalopod", "Deep-sea fish",
    "Eutrophication", "Coral", "Kelp forest",
    "Mangrove", "Seagrass", "Benthic zone", "Pelagic zone",
    # Major oceans, seas and named regions — so Nereus can answer general
    # geographic questions ("tell me about the Indian Ocean"), not just
    # species/zone-specific ones.
    "Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean",
    "Southern Ocean", "Mediterranean Sea", "Caribbean Sea", "Red Sea",
    "Gulf of Mexico", "Coral Triangle", "Sargasso Sea", "Bering Sea",
    "Mid-Atlantic Ridge", "Ring of Fire", "Continental shelf",
    "Polar ice cap", "El Niño–Southern Oscillation", "Ocean gyre",
]

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "on", "for", "with", "as", "by", "at", "from", "this", "that", "these",
    "those", "it", "its", "which", "can", "also", "has", "have", "had", "not", "they", "their",
    "may", "such", "than", "into", "about", "between", "more", "most", "other", "some", "all",
    "there", "when", "where", "while", "often", "used", "known", "due", "through", "over", "under",
}

_TOKEN_RE = re.compile(r"[a-z]{2,}")

_INDEX_PATH = lambda: os.path.join(config.ABYSS_KNOWLEDGE_BASE_DIR, "index.npz")  # noqa: E731
_META_PATH = lambda: os.path.join(config.ABYSS_KNOWLEDGE_BASE_DIR, "meta.json")  # noqa: E731

_CHUNK_CHARS = 700
_cache = None  # lazily loaded {"vectors": np.ndarray, "vocab": dict, "idf": np.ndarray, "chunks": [...]}


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS]


def _chunk_text(text: str, title: str, url: str | None) -> list[dict]:
    chunks = []
    for i in range(0, len(text), _CHUNK_CHARS):
        piece = text[i : i + _CHUNK_CHARS].strip()
        if len(piece) > 100:
            chunks.append({"text": piece, "title": title, "url": url})
    return chunks


def build_index() -> dict:
    """Fetches real article text for every topic, chunks it, builds a
    TF-IDF matrix, and persists it to disk. This hits Wikipedia ~30 times
    (cached by app.cosmos.cache afterward), so it's an explicit on-demand
    action, not something run automatically on every server start."""
    all_chunks: list[dict] = []
    fetched_titles = []
    skipped_titles = []

    for title in TOPICS:
        try:
            extract = wikipedia.detailed_extract(title)
            s = wikipedia.summary(title) if not extract else None
            text = extract or (s or {}).get("extract")
            url = (s or {}).get("pageUrl") or f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
            if not text:
                skipped_titles.append(title)
                continue
            all_chunks.extend(_chunk_text(text, title, url))
            fetched_titles.append(title)
        except Exception:
            skipped_titles.append(title)

    if not all_chunks:
        raise RuntimeError("No article text could be fetched — check network connectivity to Wikipedia.")

    tokenized = [_tokenize(c["text"]) for c in all_chunks]

    vocab: dict[str, int] = {}
    doc_freq: Counter = Counter()
    for tokens in tokenized:
        for term in set(tokens):
            if term not in vocab:
                vocab[term] = len(vocab)
            doc_freq[term] += 1

    n_docs = len(all_chunks)
    idf = np.zeros(len(vocab), dtype=np.float32)
    for term, idx in vocab.items():
        idf[idx] = math.log((n_docs + 1) / (doc_freq[term] + 1)) + 1

    matrix = np.zeros((n_docs, len(vocab)), dtype=np.float32)
    for row, tokens in enumerate(tokenized):
        if not tokens:
            continue
        tf = Counter(tokens)
        max_tf = max(tf.values())
        for term, count in tf.items():
            matrix[row, vocab[term]] = (count / max_tf) * idf[vocab[term]]

    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1
    matrix = matrix / norms

    os.makedirs(config.ABYSS_KNOWLEDGE_BASE_DIR, exist_ok=True)
    np.savez_compressed(_INDEX_PATH(), vectors=matrix, idf=idf)
    with open(_META_PATH(), "w", encoding="utf-8") as f:
        json.dump({"vocab": vocab, "chunks": all_chunks, "fetchedTitles": fetched_titles, "skippedTitles": skipped_titles}, f)

    global _cache
    _cache = {"vectors": matrix, "vocab": vocab, "idf": idf, "chunks": all_chunks}

    return {"chunkCount": n_docs, "fetchedTitles": fetched_titles, "skippedTitles": skipped_titles}


def _load_index() -> dict | None:
    global _cache
    if _cache is not None:
        return _cache
    if not os.path.exists(_INDEX_PATH()) or not os.path.exists(_META_PATH()):
        return None
    with np.load(_INDEX_PATH()) as npz:
        vectors = npz["vectors"]
        idf = npz["idf"]
    with open(_META_PATH(), encoding="utf-8") as f:
        meta = json.load(f)
    _cache = {"vectors": vectors, "vocab": meta["vocab"], "idf": idf, "chunks": meta["chunks"]}
    return _cache


def status() -> dict:
    index = _load_index()
    if index is None:
        return {"built": False, "chunkCount": 0}
    return {"built": True, "chunkCount": len(index["chunks"]), "topicCount": len(TOPICS)}


def retrieve(query: str, k: int = 3, min_score: float = 0.05) -> list[dict]:
    """Returns the top-k real article chunks most relevant to `query`, each
    with its real source title/URL and similarity score. Returns an empty
    list (not an error) if the index hasn't been built yet or nothing
    scores above min_score — callers should treat "no results" as normal."""
    index = _load_index()
    if index is None:
        return []

    tokens = _tokenize(query)
    if not tokens:
        return []

    vocab = index["vocab"]
    idf = index["idf"]
    query_vec = np.zeros(len(vocab), dtype=np.float32)
    tf = Counter(tokens)
    max_tf = max(tf.values())
    for term, count in tf.items():
        if term in vocab:
            query_vec[vocab[term]] = (count / max_tf) * idf[vocab[term]]

    norm = np.linalg.norm(query_vec)
    if norm == 0:
        return []
    query_vec = query_vec / norm

    scores = index["vectors"] @ query_vec
    top_idx = np.argsort(-scores)[:k]

    results = []
    for i in top_idx:
        if scores[i] < min_score:
            continue
        chunk = index["chunks"][i]
        results.append({"text": chunk["text"], "title": chunk["title"], "url": chunk["url"], "score": round(float(scores[i]), 3)})
    return results
