from backend.retrieval.schemas import RetrievedChunk


def reciprocal_rank_fusion(
    dense_results: list[RetrievedChunk],
    sparse_results: list[RetrievedChunk],
    *,
    k: int = 60,
    pool_size: int = 20,
) -> list[RetrievedChunk]:
    """Fuse dense and sparse ranked lists via Reciprocal Rank Fusion.

    A chunk retrieved by both lists is merged into one RetrievedChunk
    carrying both ranks, so downstream evidence-gate signals (e.g.
    "independent supporting chunks") can see cross-method agreement.
    """
    by_id: dict[str, RetrievedChunk] = {}
    scores: dict[str, float] = {}

    for chunk in dense_results:
        by_id[chunk.chunk_id] = chunk
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0.0) + 1.0 / (k + chunk.dense_rank)

    for chunk in sparse_results:
        if chunk.chunk_id in by_id:
            by_id[chunk.chunk_id].sparse_rank = chunk.sparse_rank
        else:
            by_id[chunk.chunk_id] = chunk
        scores[chunk.chunk_id] = scores.get(chunk.chunk_id, 0.0) + 1.0 / (k + chunk.sparse_rank)

    for chunk_id, score in scores.items():
        by_id[chunk_id].fusion_score = score

    ranked = sorted(by_id.values(), key=lambda c: c.fusion_score, reverse=True)
    return ranked[:pool_size]
