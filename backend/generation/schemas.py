from dataclasses import dataclass, field


@dataclass
class CitationValidation:
    cited_ids: list[str]
    unknown_ids: list[str]
    has_citation: bool
    valid: bool
    reason: str


@dataclass
class GroundingVerdict:
    verdict: str  # "pass" | "fail"
    unsupported_claims: list[str] = field(default_factory=list)


@dataclass
class ResolvedSource:
    source_id: str
    spec_number: str
    release: str
    section: str
    page: int
    snippet: str
    document_id: str
    chunk_id: str


@dataclass
class GenerationResult:
    answer: str
    grounded: bool
    refused: bool
    sources: list[ResolvedSource]
    grounding_verdict: str | None
    refusal_reason: str | None = None
    llm_latency_ms: int = 0
    release_conflict_detected: bool = False
