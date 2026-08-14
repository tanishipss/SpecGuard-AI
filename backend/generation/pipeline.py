import time

from backend.generation.citation import validate_citations
from backend.generation.grounding import check_grounding
from backend.generation.llm_client import LLMClient, get_default_client
from backend.generation.prompts import REFUSAL_TEXT, build_system_prompt
from backend.generation.schemas import GenerationResult, ResolvedSource
from backend.retrieval.schemas import RetrievalResult

INSUFFICIENT_EVIDENCE_MESSAGE = (
    "I don't have sufficient evidence in the indexed 3GPP standards to answer "
    "that reliably. Please provide a more specific question or select a "
    "specification/release."
)


def _refusal(reason: str, message: str = INSUFFICIENT_EVIDENCE_MESSAGE, llm_latency_ms: int = 0) -> GenerationResult:
    return GenerationResult(
        answer=message,
        grounded=False,
        refused=True,
        sources=[],
        grounding_verdict=None,
        refusal_reason=reason,
        llm_latency_ms=llm_latency_ms,
    )


def _resolve_sources(source_ids: list[str], chunks) -> list[ResolvedSource]:
    by_id = {c.source_id: c for c in chunks}
    resolved = []
    for source_id in source_ids:
        chunk = by_id[source_id]
        resolved.append(
            ResolvedSource(
                source_id=source_id,
                spec_number=chunk.spec_number,
                release=chunk.release,
                section=chunk.section,
                page=chunk.page_start,
                snippet=chunk.content[:280],
            )
        )
    return resolved


def generate_answer(retrieval_result: RetrievalResult, llm_client: LLMClient | None = None) -> GenerationResult:
    """Guardrail pipeline per TRD §7, steps 2-5 (step 1, the evidence gate,
    already ran inside retrieval). Refuses on: insufficient evidence,
    the model's own refusal, failed citation validation, or failed
    grounding — never returns an ungrounded or uncited factual answer.
    """
    if not retrieval_result.evidence.sufficient:
        return _refusal(f"evidence gate: {retrieval_result.evidence.reason}")

    client = llm_client or get_default_client()
    chunks = retrieval_result.chunks

    system_prompt = build_system_prompt(chunks, retrieval_result.query)
    generation_start = time.perf_counter()
    answer = client.generate(system_prompt, retrieval_result.query).strip()
    llm_latency_ms = int((time.perf_counter() - generation_start) * 1000)

    if answer == REFUSAL_TEXT:
        return _refusal(
            "model declined: context did not support an answer",
            message=REFUSAL_TEXT,
            llm_latency_ms=llm_latency_ms,
        )

    citation_validation = validate_citations(answer, chunks)
    if not citation_validation.valid:
        return _refusal(f"citation validation failed: {citation_validation.reason}", llm_latency_ms=llm_latency_ms)

    grounding_verdict = check_grounding(client, answer, chunks)
    if grounding_verdict.verdict != "pass":
        return _refusal(
            f"grounding validator failed: unsupported claims {grounding_verdict.unsupported_claims}",
            llm_latency_ms=llm_latency_ms,
        )

    return GenerationResult(
        answer=answer,
        grounded=True,
        refused=False,
        sources=_resolve_sources(citation_validation.cited_ids, chunks),
        grounding_verdict="pass",
        llm_latency_ms=llm_latency_ms,
    )
