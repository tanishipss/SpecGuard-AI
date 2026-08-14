from backend.generation.pipeline import generate_answer
from backend.generation.prompts import REFUSAL_TEXT
from backend.retrieval.schemas import EvidenceDecision, EvidenceSignals, RetrievalResult, RetrievedChunk


def make_chunk(source_id: str, content: str = "The AMF supports registration management.") -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=source_id.lower(),
        document_id="doc-1",
        spec_number="23.501",
        release="Rel-17",
        section="5.2.2.2.1",
        subsection="5.2.2.2",
        section_title="AMF",
        page_start=45,
        page_end=45,
        content=content,
        parent_context="5.2.2.2 Core network functions > 5.2.2.2.1 AMF",
        rerank_score=5.0,
        source_id=source_id,
    )


def make_retrieval_result(chunks, sufficient=True, reason="evidence sufficient", query="What is the AMF?"):
    signals = EvidenceSignals(
        top_rerank_score=5.0, score_margin=1.0, supporting_chunk_count=len(chunks),
        identifier_match=True, query_type="definitional",
    )
    return RetrievalResult(
        query=query,
        chunks=chunks,
        evidence=EvidenceDecision(sufficient=sufficient, signals=signals, reason=reason),
        dense_candidate_count=20,
        sparse_candidate_count=20,
        fused_candidate_count=20,
    )


class FakeClient:
    def __init__(self, answer=None, grounding_verdict=None):
        self._answer = answer
        self._grounding_verdict = grounding_verdict or {"verdict": "pass", "unsupported_claims": []}

    def generate(self, system_prompt, question):
        return self._answer

    def generate_json(self, prompt):
        return self._grounding_verdict


def test_insufficient_evidence_refuses_without_calling_the_llm():
    result = make_retrieval_result([], sufficient=False, reason="no candidates retrieved")

    class ExplodingClient:
        def generate(self, *a, **k):
            raise AssertionError("LLM should not be called when evidence is insufficient")

    generation = generate_answer(result, llm_client=ExplodingClient())

    assert generation.refused is True
    assert generation.grounded is False
    assert "no candidates retrieved" in generation.refusal_reason


def test_model_refusal_phrase_is_passed_through_as_a_refusal():
    result = make_retrieval_result([make_chunk("SRC-001")])
    client = FakeClient(answer=REFUSAL_TEXT)

    generation = generate_answer(result, llm_client=client)

    assert generation.refused is True
    assert generation.answer == REFUSAL_TEXT


def test_uncited_answer_is_refused_by_citation_validation():
    result = make_retrieval_result([make_chunk("SRC-001")])
    client = FakeClient(answer="The AMF supports registration management.")  # no [SRC-xxx]

    generation = generate_answer(result, llm_client=client)

    assert generation.refused is True
    assert "citation validation failed" in generation.refusal_reason


def test_unresolvable_citation_is_refused():
    result = make_retrieval_result([make_chunk("SRC-001")])
    client = FakeClient(answer="According to [SRC-999], the AMF handles registration.")

    generation = generate_answer(result, llm_client=client)

    assert generation.refused is True
    assert "citation validation failed" in generation.refusal_reason


def test_failed_grounding_is_refused_even_with_valid_citations():
    result = make_retrieval_result([make_chunk("SRC-001")])
    client = FakeClient(
        answer="According to [SRC-001], the AMF also encrypts all traffic.",
        grounding_verdict={"verdict": "fail", "unsupported_claims": ["AMF encrypts all traffic"]},
    )

    generation = generate_answer(result, llm_client=client)

    assert generation.refused is True
    assert "grounding validator failed" in generation.refusal_reason


def test_fully_grounded_and_cited_answer_is_returned_with_resolved_sources():
    result = make_retrieval_result([make_chunk("SRC-001")])
    client = FakeClient(answer="According to [SRC-001], the AMF supports registration management.")

    generation = generate_answer(result, llm_client=client)

    assert generation.refused is False
    assert generation.grounded is True
    assert generation.grounding_verdict == "pass"
    assert len(generation.sources) == 1
    assert generation.sources[0].source_id == "SRC-001"
    assert generation.sources[0].spec_number == "23.501"
    assert generation.sources[0].release == "Rel-17"
