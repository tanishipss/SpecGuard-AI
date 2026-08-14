from functools import lru_cache

from backend.config import settings

# bge-large-en-v1.5 was trained with an instruction prefix on the query side
# only; passages are embedded as-is. Using the wrong side (or no prefix)
# measurably hurts retrieval quality for this model family.
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
PASSAGE_PREFIX = ""


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    if not texts:
        return []
    model = _get_model()
    inputs = [PASSAGE_PREFIX + t for t in texts]
    vectors = model.encode(
        inputs,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vectors.tolist()


def embed_query(query: str) -> list[float]:
    model = _get_model()
    vector = model.encode(
        QUERY_PREFIX + query,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vector.tolist()
