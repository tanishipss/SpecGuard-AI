from backend.generation.prompts import build_release_conflict_notice, build_system_prompt
from backend.retrieval.release_conflict import detect_release_conflict
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(spec_number: str, release: str, chunk_id: str = "a") -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        document_id="doc-1",
        spec_number=spec_number,
        release=release,
        section="5.2.2.2.1",
        subsection="5.2.2.2",
        section_title="AMF",
        page_start=45,
        page_end=45,
        content="The AMF supports registration management.",
        parent_context=None,
        rerank_score=5.0,
        source_id=f"SRC-{chunk_id}",
    )


def test_same_release_is_not_a_conflict():
    chunks = [make_chunk("23.501", "Rel-17", "a"), make_chunk("23.501", "Rel-17", "b")]
    conflict = detect_release_conflict(chunks)
    assert conflict.detected is False
    assert conflict.conflicting_specs == {}


def test_different_specs_at_different_releases_is_not_a_conflict():
    # 23.501@Rel-17 alongside 23.502@Rel-17 is normal, expected retrieval —
    # only the SAME spec at different releases is a conflict.
    chunks = [make_chunk("23.501", "Rel-17", "a"), make_chunk("23.502", "Rel-15", "b")]
    conflict = detect_release_conflict(chunks)
    assert conflict.detected is False


def test_same_spec_at_two_releases_is_a_conflict():
    chunks = [make_chunk("23.501", "Rel-15", "a"), make_chunk("23.501", "Rel-17", "b")]
    conflict = detect_release_conflict(chunks)
    assert conflict.detected is True
    assert conflict.conflicting_specs == {"23.501": {"Rel-15", "Rel-17"}}


def test_conflict_detection_is_scoped_per_spec():
    # 23.501 conflicts across releases; 23.502 doesn't (single release) —
    # only 23.501 should show up in conflicting_specs.
    chunks = [
        make_chunk("23.501", "Rel-15", "a"),
        make_chunk("23.501", "Rel-17", "b"),
        make_chunk("23.502", "Rel-17", "c"),
        make_chunk("23.502", "Rel-17", "d"),
    ]
    conflict = detect_release_conflict(chunks)
    assert conflict.detected is True
    assert conflict.conflicting_specs == {"23.501": {"Rel-15", "Rel-17"}}


def test_empty_chunk_list_is_not_a_conflict():
    conflict = detect_release_conflict([])
    assert conflict.detected is False


def test_no_notice_text_when_no_conflict():
    assert build_release_conflict_notice(None) == ""


def test_notice_text_names_the_conflicting_spec_and_releases():
    chunks = [make_chunk("23.501", "Rel-15", "a"), make_chunk("23.501", "Rel-17", "b")]
    conflict = detect_release_conflict(chunks)

    notice = build_release_conflict_notice(conflict)

    assert "RELEASE CONFLICT DETECTED" in notice
    assert "23.501" in notice
    assert "Rel-15" in notice
    assert "Rel-17" in notice


def test_system_prompt_includes_release_in_every_source_header():
    chunks = [make_chunk("23.501", "Rel-15", "a"), make_chunk("23.501", "Rel-17", "b")]
    conflict = detect_release_conflict(chunks)

    prompt = build_system_prompt(chunks, "What is the AMF?", conflict)

    assert "[SRC-a] (Rel-15" in prompt
    assert "[SRC-b] (Rel-17" in prompt
    assert "RELEASE CONFLICT DETECTED" in prompt


def test_system_prompt_has_no_conflict_notice_when_releases_agree():
    chunks = [make_chunk("23.501", "Rel-17", "a"), make_chunk("23.501", "Rel-17", "b")]
    conflict = detect_release_conflict(chunks)

    prompt = build_system_prompt(chunks, "What is the AMF?", conflict)

    assert "RELEASE CONFLICT DETECTED" not in prompt
