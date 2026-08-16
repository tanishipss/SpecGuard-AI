import time
import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.api.schemas import ChatRequest, ChatResponse, ChatSourceOut, RetrievalMeta
from backend.config import settings
from backend.db import get_db
from backend.generation.pipeline import generate_answer
from backend.models import Query
from backend.observability import log_chat_request
from backend.rate_limit import limiter
from backend.retrieval.pipeline import retrieve

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
@limiter.limit(settings.rate_limit_chat)
def chat(request: Request, chat_request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    request_id = str(uuid.uuid4())
    start = time.perf_counter()

    retrieval_result = retrieve(db, chat_request.question, release=chat_request.release, top_k=chat_request.top_k)
    generation_result = generate_answer(retrieval_result, llm_client=None)

    latency_ms = int((time.perf_counter() - start) * 1000)

    _log_query(db, retrieval_result, generation_result, latency_ms, chat_request.question_id)
    log_chat_request(
        request_id=request_id,
        query=retrieval_result.query,
        retrieval_latency_ms=retrieval_result.retrieval_latency_ms,
        reranking_latency_ms=retrieval_result.reranking_latency_ms,
        llm_latency_ms=generation_result.llm_latency_ms,
        total_latency_ms=latency_ms,
        candidate_count=retrieval_result.fused_candidate_count,
        final_context_count=len(retrieval_result.chunks),
        grounded=generation_result.grounded,
        refused=generation_result.refused,
        model=settings.gemini_model,
        spec_filter=None,  # not yet exposed as a request parameter (TRD §9 chat request has no spec filter)
        release_filter=chat_request.release,
    )

    return ChatResponse(
        answer=generation_result.answer,
        grounded=generation_result.grounded,
        sources=[ChatSourceOut(**asdict(s)) for s in generation_result.sources],
        retrieval=RetrievalMeta(
            dense_candidates=retrieval_result.dense_candidate_count,
            sparse_candidates=retrieval_result.sparse_candidate_count,
            reranked_candidates=retrieval_result.fused_candidate_count,
            final_context=len(retrieval_result.chunks),
        ),
        grounding_verdict=generation_result.grounding_verdict,
        release_conflict_detected=generation_result.release_conflict_detected,
        latency_ms=latency_ms,
    )


def _log_query(
    db: Session,
    retrieval_result,
    generation_result,
    latency_ms: int,
    dataset_question_id: str | None = None,
) -> None:
    db.add(
        Query(
            id=uuid.uuid4(),
            question=retrieval_result.query,
            dataset_question_id=dataset_question_id,
            retrieved_chunk_ids=[c.chunk_id for c in retrieval_result.chunks],
            rerank_scores=[c.rerank_score or 0.0 for c in retrieval_result.chunks],
            evidence_sufficient=retrieval_result.evidence.sufficient,
            generated_answer=generation_result.answer,
            citations={s.source_id: asdict(s) for s in generation_result.sources},
            grounding_verdict=generation_result.grounding_verdict,
            latency_ms=latency_ms,
        )
    )
    db.commit()
