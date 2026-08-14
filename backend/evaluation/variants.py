from sqlalchemy.orm import Session

from backend.config import settings
from backend.embedding import embed_query
from backend.evaluation.schemas import EvalQuestion, VariantOutput
from backend.generation.llm_client import LLMClient
from backend.generation.pipeline import generate_answer
from backend.generation.prompts import REFUSAL_TEXT, build_system_prompt
from backend.retrieval.dense import dense_search
from backend.retrieval.fusion import reciprocal_rank_fusion
from backend.retrieval.pipeline import assign_source_ids, retrieve
from backend.retrieval.reranker import rerank
from backend.retrieval.sparse import sparse_search

BASIC_RAG_TOP_K = 5


def _is_self_refusal(answer: str) -> bool:
    return answer.strip() == REFUSAL_TEXT


def run_basic_rag(db: Session, client: LLMClient, question: EvalQuestion) -> VariantOutput:
    """Ablation floor: vector-only retrieval, no reranking, no evidence
    gate. Exists to measure how much the guardrail stack (§7) actually
    buys over the naive baseline — not meant to be run in production.
    """
    query_embedding = embed_query(question.question)
    chunks = dense_search(db, query_embedding, BASIC_RAG_TOP_K, release=question.release)
    assign_source_ids(chunks)

    system_prompt = build_system_prompt(chunks, question.question)
    answer = client.generate(system_prompt, question.question).strip()

    return VariantOutput(answer=answer, chunks=chunks, refused=_is_self_refusal(answer))


def run_hybrid_rerank(db: Session, client: LLMClient, question: EvalQuestion) -> VariantOutput:
    """+ hybrid retrieval + reranking, still no evidence gate / citation
    validation / grounding validator enforced.
    """
    query_embedding = embed_query(question.question)
    dense_results = dense_search(db, query_embedding, settings.dense_top_k, release=question.release)
    sparse_results = sparse_search(db, question.question, settings.sparse_top_k, release=question.release)
    fused = reciprocal_rank_fusion(
        dense_results, sparse_results, k=settings.rrf_k, pool_size=settings.fusion_pool_size
    )
    reranked = rerank(question.question, fused, settings.rerank_top_k)
    assign_source_ids(reranked)

    system_prompt = build_system_prompt(reranked, question.question)
    answer = client.generate(system_prompt, question.question).strip()

    return VariantOutput(answer=answer, chunks=reranked, refused=_is_self_refusal(answer))


def run_full_system(db: Session, client: LLMClient, question: EvalQuestion) -> VariantOutput:
    """The production pipeline: + evidence gate + citation validation +
    grounding validator (TRD §7 in full)."""
    retrieval_result = retrieve(db, question.question, release=question.release)
    generation_result = generate_answer(retrieval_result, llm_client=client)
    return VariantOutput(
        answer=generation_result.answer,
        chunks=retrieval_result.chunks,
        refused=generation_result.refused,
    )


VARIANTS = {
    "basic_rag": run_basic_rag,
    "hybrid_rerank": run_hybrid_rerank,
    "full_system": run_full_system,
}
