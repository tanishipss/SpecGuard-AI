from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Chunk, Document
from backend.retrieval.schemas import RetrievedChunk, from_chunk_row


def dense_search(
    db: Session,
    query_embedding: list[float],
    top_k: int,
    *,
    release: str | None = None,
) -> list[RetrievedChunk]:
    """Nearest-neighbor search over chunk embeddings via pgvector's HNSW
    index, ranked by cosine distance (ascending — closer is more relevant).
    """
    distance = Chunk.embedding.cosine_distance(query_embedding).label("distance")
    stmt = (
        select(Chunk, Document.spec_number, Document.release, distance)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.embedding.is_not(None))
    )
    if release:
        stmt = stmt.where(Document.release == release)
    stmt = stmt.order_by(distance.asc()).limit(top_k)

    results: list[RetrievedChunk] = []
    for rank, (chunk, spec_number, doc_release, _dist) in enumerate(db.execute(stmt).all(), start=1):
        results.append(from_chunk_row(chunk, spec_number, doc_release, dense_rank=rank))
    return results
