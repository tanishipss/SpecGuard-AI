from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.config import settings


def _validate_full_name(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("Full name cannot be empty")
    if len(trimmed) < 2:
        raise ValueError("Full name is too short")
    if len(trimmed) > 100:
        raise ValueError("Full name is too long")
    return trimmed


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return _validate_full_name(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return _validate_full_name(value)


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


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
    chunk_count: int

    model_config = {"from_attributes": True}


class DocumentSectionOut(BaseModel):
    chunk_id: str
    section: str
    subsection: str | None
    section_title: str
    page_start: int
    page_end: int
    content: str
    token_count: int


class DocumentDetailOut(BaseModel):
    id: str
    spec_number: str
    title: str
    release: str
    version: str
    ingested_at: datetime
    chunk_count: int
    sections: list[DocumentSectionOut]


class DocumentSearchResultOut(BaseModel):
    chunk_id: str
    section: str
    subsection: str | None
    section_title: str
    page_start: int
    page_end: int
    snippet: str


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
    # Eval-tooling only: an evaluation/dataset.json question id (e.g. "q001"),
    # stamped onto the resulting Query row so evaluation code can join back
    # to that dataset entry's ground_truth without matching on question
    # text. Never set by the real product frontend. See
    # evaluation/seed_eval_queries.py and backend/evaluation/ragas_dataset.py.
    question_id: str | None = Field(default=None, max_length=16)


class ChatSourceOut(BaseModel):
    source_id: str
    spec_number: str
    release: str
    section: str
    page: int
    snippet: str
    document_id: str
    chunk_id: str


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
    # TRD §8: deterministic, code-level flag (backend.retrieval.release_conflict)
    # set whenever the final chunk set spans more than one release for the
    # same spec — auditable independent of whether the model's own prose
    # actually calls out the conflict.
    release_conflict_detected: bool
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
    """GET /api/v1/eval/run's response. Scores whatever has actually been
    seeded into the `queries` table (see evaluation/seed_eval_queries.py)
    against evaluation/dataset.json's ground_truth answers — it does not
    run the pipeline live, so hitting this endpoint is cheap-ish (LLM calls
    are bounded by how many questions were already seeded, not by a fresh
    45-question generation pass). For the 3-variant basic/hybrid/full
    ablation, see evaluation/run_ablation.py and GET /api/v1/eval/ablation.
    """

    timestamp: str
    total_dataset_questions: int
    scored_question_count: int
    partial: bool
    citation_correctness_rate: float | None
    hallucination_rate: float | None
    precision_at_5: float | None
    recall_at_5: float | None
    mrr: float | None
    precision_scored_question_count: int
    faithfulness: float | None
    answer_relevance: float | None
    context_relevance: float | None
    message: str
