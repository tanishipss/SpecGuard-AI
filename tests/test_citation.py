from backend.generation.citation import extract_cited_ids, validate_citations
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(source_id: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=source_id.lower(),
        document_id="doc-1",
        spec_number="23.501",
        release="Rel-17",
        section="5.1",
        subsection=None,
        section_title="Overview",
        page_start=1,
        page_end=1,
        content="content",
        parent_context=None,
        source_id=source_id,
    )


def test_extract_cited_ids_deduplicates_preserving_first_occurrence():
    answer = "The AMF does X [SRC-002]. It also does Y [SRC-001], and again [SRC-002]."
    assert extract_cited_ids(answer) == ["SRC-002", "SRC-001"]


def test_valid_when_all_citations_resolve():
    chunks = [make_chunk("SRC-001"), make_chunk("SRC-002")]
    result = validate_citations("According to [SRC-001], the AMF handles registration.", chunks)
    assert result.valid is True
    assert result.unknown_ids == []


def test_invalid_when_no_citation_present():
    chunks = [make_chunk("SRC-001")]
    result = validate_citations("The AMF handles registration management.", chunks)
    assert result.valid is False
    assert result.has_citation is False


def test_invalid_when_citation_does_not_resolve():
    chunks = [make_chunk("SRC-001")]
    result = validate_citations("According to [SRC-999], the AMF handles registration.", chunks)
    assert result.valid is False
    assert result.unknown_ids == ["SRC-999"]


def test_invalid_when_one_of_multiple_citations_is_unresolvable():
    chunks = [make_chunk("SRC-001")]
    result = validate_citations("[SRC-001] and also [SRC-002] say so.", chunks)
    assert result.valid is False
    assert result.unknown_ids == ["SRC-002"]
