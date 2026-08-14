from backend.config import settings
from backend.retrieval import evidence_gate
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(chunk_id: str, content: str, rerank_score: float) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
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
        rerank_score=rerank_score,
    )


def test_classify_query_type_definitional():
    assert evidence_gate.classify_query_type("What is the AMF?") == "definitional"
    assert evidence_gate.classify_query_type("Define 5QI.") == "definitional"


def test_classify_query_type_procedural():
    assert evidence_gate.classify_query_type("How does the AMF register a UE?") == "procedural"


def test_extract_identifiers_finds_acronyms_and_alphanumeric_ids():
    identifiers = evidence_gate.extract_identifiers("What does the AMF do with 5QI and N2 messages?")
    assert "AMF" in identifiers
    assert "5QI" in identifiers
    assert "N2" in identifiers
    assert "does" not in identifiers
    assert "with" not in identifiers


def test_no_candidates_is_insufficient():
    signals = evidence_gate.compute_signals("What is the AMF?", [])
    decision = evidence_gate.decide(signals)
    assert decision.sufficient is False


def test_strong_agreement_and_identifier_match_is_sufficient():
    chunks = [
        make_chunk("a", "The AMF supports registration management.", rerank_score=5.0),
        make_chunk("b", "The AMF also supports mobility management.", rerank_score=4.0),
        make_chunk("c", "Connection management is handled by the AMF.", rerank_score=3.0),
    ]
    signals = evidence_gate.compute_signals("What is the AMF?", chunks)
    decision = evidence_gate.decide(signals)

    assert signals.identifier_match is True
    assert signals.supporting_chunk_count == 3
    assert decision.sufficient is True


def test_low_score_is_refused_even_with_identifier_match():
    chunks = [
        make_chunk("a", "The AMF is mentioned here in passing.", rerank_score=-5.0),
        make_chunk("b", "Unrelated content.", rerank_score=-6.0),
    ]
    signals = evidence_gate.compute_signals("What is the AMF?", chunks)
    decision = evidence_gate.decide(signals)

    assert decision.sufficient is False
    assert "threshold" in decision.reason


def test_low_agreement_but_identifier_match_can_still_pass():
    # Only one supporting chunk (below evidence_min_supporting_chunks), but
    # the query's identifier is literally present and the score clears the
    # floor — the identifier match should rescue this per §7.1.
    chunks = [make_chunk("a", "The AMF supports registration management.", rerank_score=5.0)]
    signals = evidence_gate.compute_signals("What is the AMF?", chunks)
    decision = evidence_gate.decide(signals)

    assert signals.supporting_chunk_count == 1
    assert signals.identifier_match is True
    assert decision.sufficient is True


def test_definitional_queries_use_a_stricter_threshold():
    bonus = settings.evidence_definitional_score_bonus
    borderline_score = settings.evidence_min_rerank_score + bonus - 0.1

    chunks = [
        make_chunk("a", "Some AMF-adjacent content.", rerank_score=borderline_score),
        make_chunk("b", "More AMF-adjacent content.", rerank_score=borderline_score - 0.6),
    ]
    signals = evidence_gate.compute_signals("What is the AMF?", chunks)
    decision = evidence_gate.decide(signals)

    # Below the definitional-boosted threshold, and identifier match alone
    # can't rescue a failure of the score floor itself.
    assert decision.sufficient is False
