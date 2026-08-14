from backend.ingestion.quality import check_chunks
from backend.ingestion.schemas import ChunkCandidate


def make_chunk(**overrides) -> ChunkCandidate:
    defaults = dict(
        document_id="doc-1",
        section="5.1",
        subsection=None,
        section_title="Overview",
        content="This is a reasonably long chunk of body text about the AMF.",
        page_start=1,
        page_end=1,
        parent_context="5.1 Overview",
        token_count=15,
    )
    defaults.update(overrides)
    return ChunkCandidate(**defaults)


def test_flags_too_short_content():
    chunk = make_chunk(content="short")
    issues = check_chunks([chunk], max_tokens=900)
    assert any("too short" in i.reason for i in issues)


def test_flags_grossly_oversized_chunk():
    chunk = make_chunk(token_count=2000)
    issues = check_chunks([chunk], max_tokens=900)
    assert any("max_tokens" in i.reason for i in issues)


def test_flags_inverted_page_range():
    chunk = make_chunk(page_start=10, page_end=5)
    issues = check_chunks([chunk], max_tokens=900)
    assert any("page_start > page_end" in i.reason for i in issues)


def test_flags_missing_section_title():
    chunk = make_chunk(section_title="  ")
    issues = check_chunks([chunk], max_tokens=900)
    assert any("missing section title" in i.reason for i in issues)


def test_clean_chunk_has_no_issues():
    chunk = make_chunk()
    issues = check_chunks([chunk], max_tokens=900)
    assert issues == []
