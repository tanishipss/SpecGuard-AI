import logging
from functools import lru_cache

from backend.config import settings

logger = logging.getLogger(__name__)

# bge-large-en-v1.5 was trained with an instruction prefix on the query side
# only; passages are embedded as-is. Using the wrong side (or no prefix)
# measurably hurts retrieval quality for this model family.
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
PASSAGE_PREFIX = ""


@lru_cache(maxsize=1)
def _get_model():
    import os

    import torch
    from sentence_transformers import SentenceTransformer

    # No GPU in this environment — without this, torch defaults to 4 threads
    # on an 8-core box, leaving half the CPU idle during embedding.
    torch.set_num_threads(os.cpu_count() or 4)

    return SentenceTransformer(settings.embedding_model)


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    if not texts:
        return []
    model = _get_model()
    inputs = [PASSAGE_PREFIX + t for t in texts]

    # Large ingestion runs are otherwise silent for the entire encode() call
    # (tens of minutes) — encode in explicit batches and log between them so
    # a stalled run is visible instead of indistinguishable from a hang.
    total_batches = (len(inputs) + batch_size - 1) // batch_size
    log_every = max(1, total_batches // 20)

    vectors = []
    for i in range(0, len(inputs), batch_size):
        batch = inputs[i : i + batch_size]
        vectors.extend(
            model.encode(batch, normalize_embeddings=True, show_progress_bar=False).tolist()
        )
        batch_num = i // batch_size + 1
        if batch_num % log_every == 0 or batch_num == total_batches:
            logger.info("Embedding progress: batch %d/%d", batch_num, total_batches)

    return vectors


def embed_query(query: str) -> list[float]:
    model = _get_model()
    vector = model.encode(
        QUERY_PREFIX + query,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return vector.tolist()
