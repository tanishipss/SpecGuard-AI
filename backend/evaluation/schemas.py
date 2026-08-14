from dataclasses import dataclass, field

from backend.retrieval.schemas import RetrievedChunk


@dataclass
class EvalQuestion:
    id: str
    category: str
    question: str
    release: str | None
    expected_refusal: bool
    # "{spec_number}#{section}" keys of chunks that should be retrieved for
    # this question. Left empty until populated against a real ingested
    # corpus + manual relevance judgments — see evaluation/dataset.json's
    # "_meta" block for the convention. Retrieval metrics for a question
    # are skipped (not counted as zero) while this is empty.
    gold_sections: list[str] = field(default_factory=list)


@dataclass
class RetrievalMetrics:
    recall_at_k: float
    precision_at_k: float
    mrr: float
    k: int
    scored_question_count: int


@dataclass
class GenerationMetrics:
    hallucination_rate: float
    citation_correctness_rate: float
    refusal_accuracy: float
    total_answers: int


@dataclass
class VariantOutput:
    answer: str
    chunks: list[RetrievedChunk]
    refused: bool


@dataclass
class EvalCaseResult:
    question_id: str
    category: str
    question: str
    expected_refusal: bool
    refused: bool
    answer: str
    retrieved_keys: list[str]
    citation_valid: bool | None  # None when refused — citation validity is moot
    hallucinated: bool | None  # None when refused — nothing was asserted to check


@dataclass
class EvalRunResult:
    variant_name: str
    cases: list[EvalCaseResult]
    generation_metrics: GenerationMetrics
    retrieval_metrics: RetrievalMetrics | None
