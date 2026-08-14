import pytest

from backend.evaluation.retrieval_metrics import (
    aggregate_retrieval_metrics,
    chunk_gold_key,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
)


def test_chunk_gold_key_format():
    assert chunk_gold_key("23.501", "5.2.2.2.1") == "23.501#5.2.2.2.1"


def test_recall_at_k_full_hit():
    retrieved = ["a", "b", "c"]
    gold = ["a", "b"]
    assert recall_at_k(retrieved, gold, k=3) == 1.0


def test_recall_at_k_partial_hit_and_k_cutoff():
    retrieved = ["a", "x", "y", "b"]
    gold = ["a", "b"]
    assert recall_at_k(retrieved, gold, k=2) == 0.5  # "b" is past the cutoff


def test_recall_at_k_requires_gold_keys():
    with pytest.raises(ValueError):
        recall_at_k(["a"], [], k=5)


def test_precision_at_k():
    retrieved = ["a", "x", "y"]
    gold = ["a", "b"]
    assert abs(precision_at_k(retrieved, gold, k=3) - (1 / 3)) < 1e-9


def test_precision_at_k_empty_retrieval_is_zero():
    assert precision_at_k([], ["a"], k=5) == 0.0


def test_reciprocal_rank_first_position():
    assert reciprocal_rank(["a", "b"], ["a"]) == 1.0


def test_reciprocal_rank_third_position():
    assert abs(reciprocal_rank(["x", "y", "a"], ["a"]) - (1 / 3)) < 1e-9


def test_reciprocal_rank_no_match_is_zero():
    assert reciprocal_rank(["x", "y"], ["a"]) == 0.0


def test_aggregate_retrieval_metrics_averages_across_questions():
    scored_pairs = [
        (["a", "b"], ["a"]),  # recall=1, precision=0.5, rr=1
        (["x", "y"], ["a"]),  # recall=0, precision=0, rr=0
    ]
    metrics = aggregate_retrieval_metrics(scored_pairs, k=2)

    assert metrics.recall_at_k == 0.5
    assert metrics.precision_at_k == 0.25
    assert metrics.mrr == 0.5
    assert metrics.scored_question_count == 2


def test_aggregate_retrieval_metrics_empty_input_returns_none():
    assert aggregate_retrieval_metrics([], k=5) is None


def test_aggregate_retrieval_metrics_rejects_missing_gold():
    with pytest.raises(ValueError):
        aggregate_retrieval_metrics([(["a"], [])], k=5)
