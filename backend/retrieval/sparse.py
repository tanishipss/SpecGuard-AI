from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Chunk, Document
from backend.retrieval.schemas import RetrievedChunk, from_chunk_row


def sparse_search(
    db: Session,
    query_text: str,
    top_k: int,
    *,
    release: str | None = None,
) -> list[RetrievedChunk]:
    """Lexical search over chunk content via Postgres full-text search
    (tsvector + GIN), ranked by ts_rank_cd. Catches exact technical
    identifiers ("N2 interface", "5QI") that dense embeddings can miss.
    """
    tsquery = func.plainto_tsquery("english", query_text)
    rank = func.ts_rank_cd(Chunk.tsv, tsquery).label("rank")

    stmt = (
        select(Chunk, Document.spec_number, Document.release, rank)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.tsv.op("@@")(tsquery))
    )
    if release:
        stmt = stmt.where(Document.release == release)
    stmt = stmt.order_by(rank.desc()).limit(top_k)

    results: list[RetrievedChunk] = []
    for sparse_rank, (chunk, spec_number, doc_release, _rank) in enumerate(db.execute(stmt).all(), start=1):
        results.append(from_chunk_row(chunk, spec_number, doc_release, sparse_rank=sparse_rank))
    return results
