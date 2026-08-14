from datetime import datetime

from pydantic import BaseModel, Field

from backend.config import settings


class IngestRequest(BaseModel):
    file_path: str
    spec_number: str = Field(max_length=32)
    release: str = Field(max_length=16)
    version: str = Field(max_length=32)
    title: str | None = None


class IngestResponse(BaseModel):
    document_id: str
    skipped: bool
    chunk_count: int
    quality_issue_count: int


class DocumentOut(BaseModel):
    id: str
    spec_number: str
    title: str
    release: str
    version: str
    ingested_at: datetime

    model_config = {"from_attributes": True}


class RetrieveRequest(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_question_length)
    release: str | None = None


class RetrievedChunkOut(BaseModel):
    source_id: str
    spec_number: str
    release: str
    section: str
    subsection: str | None
    section_title: str
    page_start: int
    page_end: int
    snippet: str
    parent_context: str | None
    dense_rank: int | None
    sparse_rank: int | None
    fusion_score: float
    rerank_score: float | None


class EvidenceOut(BaseModel):
    sufficient: bool
    reason: str
    top_rerank_score: float
    score_margin: float
    supporting_chunk_count: int
    identifier_match: bool
    query_type: str


class RetrieveResponse(BaseModel):
    question: str
    sources: list[RetrievedChunkOut]
    evidence: EvidenceOut
    dense_candidates: int
    sparse_candidates: int
    fused_candidates: int


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_question_length)
    release: str | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)


class ChatSourceOut(BaseModel):
    source_id: str
    spec_number: str
    release: str
    section: str
    page: int
    snippet: str


class RetrievalMeta(BaseModel):
    dense_candidates: int
    sparse_candidates: int
    reranked_candidates: int
    final_context: int


class ChatResponse(BaseModel):
    answer: str
    grounded: bool
    sources: list[ChatSourceOut]
    retrieval: RetrievalMeta
    grounding_verdict: str | None
    latency_ms: int


class VariantMetricsOut(BaseModel):
    variant_name: str
    hallucination_rate: float
    citation_correctness_rate: float
    refusal_accuracy: float
    total_answers: int
    recall_at_k: float | None
    precision_at_k: float | None
    mrr: float | None
    scored_question_count: int


class EvalRunResponse(BaseModel):
    question_count: int
    variants: list[VariantMetricsOut]
    ablation_table_markdown: str
