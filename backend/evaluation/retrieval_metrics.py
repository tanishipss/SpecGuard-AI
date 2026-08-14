from backend.evaluation.schemas import RetrievalMetrics


def chunk_gold_key(spec_number: str, section: str) -> str:
    return f"{spec_number}#{section}"


def recall_at_k(retrieved_keys: list[str], gold_keys: list[str], k: int) -> float:
    if not gold_keys:
        raise ValueError("recall_at_k requires at least one gold key")
    hits = set(retrieved_keys[:k]) & set(gold_keys)
    return len(hits) / len(set(gold_keys))


def precision_at_k(retrieved_keys: list[str], gold_keys: list[str], k: int) -> float:
    top_k = retrieved_keys[:k]
    if not top_k:
        return 0.0
    hits = set(top_k) & set(gold_keys)
    return len(hits) / len(top_k)


def reciprocal_rank(retrieved_keys: list[str], gold_keys: list[str]) -> float:
    gold_set = set(gold_keys)
    for rank, key in enumerate(retrieved_keys, start=1):
        if key in gold_set:
            return 1.0 / rank
    return 0.0


def aggregate_retrieval_metrics(
    scored_pairs: list[tuple[list[str], list[str]]],
    k: int,
) -> RetrievalMetrics | None:
    """Average Recall@k / Precision@k / MRR over questions that have gold
    keys. `scored_pairs` is (retrieved_keys, gold_keys) per question;
    questions with empty gold_keys should already be filtered out by the
    caller — this only asserts that invariant.
    """
    if not scored_pairs:
        return None

    recalls, precisions, rrs = [], [], []
    for retrieved, gold in scored_pairs:
        if not gold:
            raise ValueError("aggregate_retrieval_metrics received a question with no gold keys")
        recalls.append(recall_at_k(retrieved, gold, k))
        precisions.append(precision_at_k(retrieved, gold, k))
        rrs.append(reciprocal_rank(retrieved, gold))

    n = len(scored_pairs)
    return RetrievalMetrics(
        recall_at_k=sum(recalls) / n,
        precision_at_k=sum(precisions) / n,
        mrr=sum(rrs) / n,
        k=k,
        scored_question_count=n,
    )
