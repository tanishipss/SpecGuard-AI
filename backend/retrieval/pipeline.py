import time

from sqlalchemy.orm import Session

from backend.config import settings
from backend.embedding import embed_query
from backend.retrieval import evidence_gate
from backend.retrieval.dense import dense_search
from backend.retrieval.fusion import reciprocal_rank_fusion
from backend.retrieval.reranker import rerank
from backend.retrieval.schemas import RetrievalResult
from backend.retrieval.sparse import sparse_search


def assign_source_ids(chunks: list) -> None:
    """Assign SRC-001, SRC-002, ... in rank order (TRD §5). Done server-side
    so the generator can only ever cite an ID that resolves to a real chunk.
    """
    for i, chunk in enumerate(chunks, start=1):
        chunk.source_id = f"SRC-{i:03d}"


def retrieve(
    db: Session,
    query: str,
    *,
    release: str | None = None,
    top_k: int | None = None,
) -> RetrievalResult:
    retrieval_start = time.perf_counter()
    query_embedding = embed_query(query)

    dense_results = dense_search(db, query_embedding, settings.dense_top_k, release=release)
    sparse_results = sparse_search(db, query, settings.sparse_top_k, release=release)

    fused = reciprocal_rank_fusion(
        dense_results,
        sparse_results,
        k=settings.rrf_k,
        pool_size=settings.fusion_pool_size,
    )
    retrieval_latency_ms = int((time.perf_counter() - retrieval_start) * 1000)

    reranking_start = time.perf_counter()
    reranked = rerank(query, fused, top_k or settings.rerank_top_k)
    assign_source_ids(reranked)
    reranking_latency_ms = int((time.perf_counter() - reranking_start) * 1000)

    signals = evidence_gate.compute_signals(query, reranked)
    decision = evidence_gate.decide(signals)

    return RetrievalResult(
        query=query,
        chunks=reranked,
        evidence=decision,
        dense_candidate_count=len(dense_results),
        sparse_candidate_count=len(sparse_results),
        fused_candidate_count=len(fused),
        retrieval_latency_ms=retrieval_latency_ms,
        reranking_latency_ms=reranking_latency_ms,
    )
