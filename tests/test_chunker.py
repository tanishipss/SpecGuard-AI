from backend.ingestion.chunker import chunk_document
from backend.ingestion.schemas import ParsedDocument, ParsedSection
from backend.ingestion.tokens import count_tokens

DOC_ID = "doc-1"


def make_document(sections: list[ParsedSection], heading_index: dict[str, str] | None = None) -> ParsedDocument:
    return ParsedDocument(
        spec_number="23.501",
        title="System architecture for the 5G System",
        release="Rel-17",
        version="h70",
        source_file="23501-h70.pdf",
        document_hash="abc123",
        sections=sections,
        heading_index=heading_index or {},
    )


def test_small_section_becomes_a_single_chunk():
    section = ParsedSection(
        section="5.2.2.2.1",
        subsection="5.2.2.2",
        section_title="AMF",
        content="The AMF supports registration management, connection management, "
        "reachability management, and mobility management.",
        page_start=45,
        page_end=45,
        level=5,
    )
    heading_index = {"5.2.2.2": "Core network functions", "5.2.2.2.1": "AMF"}
    doc = make_document([section], heading_index)

    chunks = chunk_document(doc, DOC_ID, min_tokens=500, max_tokens=900, overlap_tokens=75)

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.content == section.content
    assert chunk.section == "5.2.2.2.1"
    assert chunk.subsection == "5.2.2.2"
    assert chunk.document_id == DOC_ID
    assert "Core network functions" in chunk.parent_context
    assert "5.2.2.2.1 AMF" in chunk.parent_context


def test_oversized_section_is_split_by_paragraph_with_overlap():
    # Each paragraph is short (~30 tokens) relative to overlap_tokens (50),
    # so the overlap seed can carry a whole paragraph into the next piece
    # without pushing it over max_tokens.
    paragraphs = [f"Paragraph {i} discusses a distinct aspect of AMF behavior." for i in range(20)]
    content = "\n\n".join(paragraphs)
    section = ParsedSection(
        section="5.2.2.2",
        subsection="5.2.2",
        section_title="Core network functions",
        content=content,
        page_start=40,
        page_end=50,
        level=4,
    )
    doc = make_document([section])

    chunks = chunk_document(doc, DOC_ID, min_tokens=500, max_tokens=150, overlap_tokens=50)

    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.token_count <= 150 + 15  # one paragraph's worth of packing slack
        assert chunk.section == "5.2.2.2"
        assert chunk.subsection == "5.2.2"

    # Consecutive pieces should share an overlap seed paragraph.
    first_paragraphs = set(chunks[0].content.split("\n\n"))
    second_paragraphs = set(chunks[1].content.split("\n\n"))
    assert first_paragraphs & second_paragraphs


def test_overlap_never_forces_a_piece_past_max_tokens_when_paragraphs_are_large():
    # Each paragraph alone is larger than overlap_tokens. The overlap seed
    # must skip it rather than force-including it, or every piece after the
    # first would balloon to 2x max_tokens.
    paragraphs = [f"Paragraph {i} discusses a distinct aspect of AMF behavior in detail. " * 20 for i in range(6)]
    content = "\n\n".join(paragraphs)
    section = ParsedSection("5.2.2.2", "5.2.2", "Core network functions", content, 40, 50, 4)
    doc = make_document([section])

    chunks = chunk_document(doc, DOC_ID, min_tokens=500, max_tokens=300, overlap_tokens=50)

    for chunk in chunks:
        assert chunk.token_count <= 300 * 1.05


def test_sections_are_never_merged_across_headings():
    section_a = ParsedSection("5.1", None, "Overview", "Short overview text.", 10, 10, 3)
    section_b = ParsedSection("5.2", None, "Concepts", "Short concepts text.", 11, 11, 3)
    doc = make_document([section_a, section_b])

    chunks = chunk_document(doc, DOC_ID, min_tokens=500, max_tokens=900, overlap_tokens=75)

    assert len(chunks) == 2
    assert chunks[0].section == "5.1"
    assert chunks[1].section == "5.2"


def test_document_metadata_never_mixed_between_specs():
    doc_a = make_document([ParsedSection("1", None, "Scope", "Spec A content.", 1, 1, 1)])
    doc_a.spec_number = "23.501"
    doc_b = make_document([ParsedSection("1", None, "Scope", "Spec B content.", 1, 1, 1)])
    doc_b.spec_number = "23.502"

    chunks_a = chunk_document(doc_a, "doc-a", min_tokens=500, max_tokens=900, overlap_tokens=75)
    chunks_b = chunk_document(doc_b, "doc-b", min_tokens=500, max_tokens=900, overlap_tokens=75)

    assert chunks_a[0].document_id == "doc-a"
    assert chunks_b[0].document_id == "doc-b"
    assert chunks_a[0].content != chunks_b[0].content


def test_token_count_matches_declared_tokenizer():
    text = "The AMF is responsible for registration management."
    section = ParsedSection("5.2", None, "AMF", text, 1, 1, 1)
    doc = make_document([section])

    chunks = chunk_document(doc, DOC_ID, min_tokens=500, max_tokens=900, overlap_tokens=75)

    assert chunks[0].token_count == count_tokens(text)
