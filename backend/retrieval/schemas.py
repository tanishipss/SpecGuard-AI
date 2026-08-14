from dataclasses import dataclass

from backend.models import Chunk


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    spec_number: str
    release: str
    section: str
    subsection: str | None
    section_title: str
    page_start: int
    page_end: int
    content: str
    parent_context: str | None

    dense_rank: int | None = None
    sparse_rank: int | None = None
    fusion_score: float = 0.0
    rerank_score: float | None = None
    source_id: str | None = None


@dataclass
class EvidenceSignals:
    top_rerank_score: float
    score_margin: float
    supporting_chunk_count: int
    identifier_match: bool
    query_type: str


@dataclass
class EvidenceDecision:
    sufficient: bool
    signals: EvidenceSignals
    reason: str


@dataclass
class RetrievalResult:
    query: str
    chunks: list[RetrievedChunk]
    evidence: EvidenceDecision
    dense_candidate_count: int
    sparse_candidate_count: int
    fused_candidate_count: int
    retrieval_latency_ms: int = 0
    reranking_latency_ms: int = 0


def from_chunk_row(
    chunk: Chunk,
    spec_number: str,
    release: str,
    *,
    dense_rank: int | None = None,
    sparse_rank: int | None = None,
) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=str(chunk.id),
        document_id=str(chunk.document_id),
        spec_number=spec_number,
        release=release,
        section=chunk.section,
        subsection=chunk.subsection,
        section_title=chunk.section_title,
        page_start=chunk.page_start,
        page_end=chunk.page_end,
        content=chunk.content,
        parent_context=chunk.parent_context,
        dense_rank=dense_rank,
        sparse_rank=sparse_rank,
    )
