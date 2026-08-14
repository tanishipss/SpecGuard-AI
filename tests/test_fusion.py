from backend.retrieval.fusion import reciprocal_rank_fusion
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(chunk_id: str, **overrides) -> RetrievedChunk:
    defaults = dict(
        chunk_id=chunk_id,
        document_id="doc-1",
        spec_number="23.501",
        release="Rel-17",
        section="5.1",
        subsection=None,
        section_title="Overview",
        page_start=1,
        page_end=1,
        content=f"content for {chunk_id}",
        parent_context=None,
    )
    defaults.update(overrides)
    return RetrievedChunk(**defaults)


def test_chunk_in_both_lists_merges_ranks_and_sums_score():
    dense = [make_chunk("a", dense_rank=1), make_chunk("b", dense_rank=2)]
    sparse = [make_chunk("a", sparse_rank=1), make_chunk("c", sparse_rank=2)]

    fused = reciprocal_rank_fusion(dense, sparse, k=60, pool_size=10)
    by_id = {c.chunk_id: c for c in fused}

    assert by_id["a"].dense_rank == 1
    assert by_id["a"].sparse_rank == 1
    expected_score_a = 1 / (60 + 1) + 1 / (60 + 1)
    assert abs(by_id["a"].fusion_score - expected_score_a) < 1e-9

    # "a" appears in both lists so it should outrank chunks appearing in only one.
    assert fused[0].chunk_id == "a"


def test_dense_only_and_sparse_only_chunks_both_survive():
    dense = [make_chunk("a", dense_rank=1)]
    sparse = [make_chunk("b", sparse_rank=1)]

    fused = reciprocal_rank_fusion(dense, sparse, k=60, pool_size=10)

    ids = {c.chunk_id for c in fused}
    assert ids == {"a", "b"}


def test_pool_size_truncates_results():
    dense = [make_chunk(f"d{i}", dense_rank=i + 1) for i in range(30)]

    fused = reciprocal_rank_fusion(dense, [], k=60, pool_size=5)

    assert len(fused) == 5
    assert fused[0].chunk_id == "d0"  # rank 1 (best) preserved after truncation


def test_empty_inputs_produce_empty_result():
    assert reciprocal_rank_fusion([], [], k=60, pool_size=10) == []
