from functools import lru_cache

from backend.config import settings
from backend.retrieval.schemas import RetrievedChunk


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import CrossEncoder

    return CrossEncoder(settings.reranker_model)


def rerank(query: str, candidates: list[RetrievedChunk], top_k: int) -> list[RetrievedChunk]:
    """Jointly score (query, chunk) pairs with a cross-encoder — more
    precise than the bi-encoder fusion score alone, since it attends to
    the query and passage together rather than comparing fixed vectors.
    """
    if not candidates:
        return []

    model = _get_model()
    pairs = [(query, c.content) for c in candidates]
    scores = model.predict(pairs)

    for chunk, score in zip(candidates, scores, strict=False):
        chunk.rerank_score = float(score)

    ranked = sorted(candidates, key=lambda c: c.rerank_score, reverse=True)
    return ranked[:top_k]
