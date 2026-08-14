from backend.retrieval.pipeline import assign_source_ids
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(chunk_id: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
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
    )


def test_source_ids_assigned_in_rank_order_starting_at_001():
    chunks = [make_chunk("a"), make_chunk("b"), make_chunk("c")]
    assign_source_ids(chunks)
    assert [c.source_id for c in chunks] == ["SRC-001", "SRC-002", "SRC-003"]


def test_source_ids_are_unique_and_map_back_to_the_right_chunk():
    chunks = [make_chunk("x"), make_chunk("y")]
    assign_source_ids(chunks)
    resolved = {c.source_id: c.chunk_id for c in chunks}
    assert resolved == {"SRC-001": "x", "SRC-002": "y"}
