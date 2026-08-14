from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas import EvidenceOut, RetrievedChunkOut, RetrieveRequest, RetrieveResponse
from backend.db import get_db
from backend.retrieval.pipeline import retrieve

router = APIRouter()

SNIPPET_CHARS = 500


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_chunks(request: RetrieveRequest, db: Session = Depends(get_db)) -> RetrieveResponse:
    """Debug/inspection endpoint for the retrieval pipeline — returns the
    resolved SRC-ID sources and evidence-gate decision without generation.
    """
    result = retrieve(db, request.question, release=request.release)

    sources = [
        RetrievedChunkOut(
            source_id=c.source_id,
            spec_number=c.spec_number,
            release=c.release,
            section=c.section,
            subsection=c.subsection,
            section_title=c.section_title,
            page_start=c.page_start,
            page_end=c.page_end,
            snippet=c.content[:SNIPPET_CHARS],
            parent_context=c.parent_context,
            dense_rank=c.dense_rank,
            sparse_rank=c.sparse_rank,
            fusion_score=c.fusion_score,
            rerank_score=c.rerank_score,
        )
        for c in result.chunks
    ]

    evidence = EvidenceOut(
        sufficient=result.evidence.sufficient,
        reason=result.evidence.reason,
        top_rerank_score=result.evidence.signals.top_rerank_score,
        score_margin=result.evidence.signals.score_margin,
        supporting_chunk_count=result.evidence.signals.supporting_chunk_count,
        identifier_match=result.evidence.signals.identifier_match,
        query_type=result.evidence.signals.query_type,
    )

    return RetrieveResponse(
        question=result.query,
        sources=sources,
        evidence=evidence,
        dense_candidates=result.dense_candidate_count,
        sparse_candidates=result.sparse_candidate_count,
        fused_candidates=result.fused_candidate_count,
    )
