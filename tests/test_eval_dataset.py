from collections import Counter

from backend.evaluation.dataset import DEFAULT_DATASET_PATH, load_dataset

EXPECTED_CATEGORY_COUNTS = {
    "factual": 10,
    "procedural": 10,
    "comparison": 5,
    "multi_hop": 5,
    "out_of_scope": 10,
    "adversarial": 5,
}


def test_dataset_loads_and_has_expected_size():
    questions = load_dataset()
    assert len(questions) == 45


def test_dataset_category_counts_match_trd_spec():
    questions = load_dataset()
    counts = Counter(q.category for q in questions)
    assert counts == EXPECTED_CATEGORY_COUNTS


def test_dataset_ids_are_unique():
    questions = load_dataset()
    ids = [q.id for q in questions]
    assert len(ids) == len(set(ids))


def test_out_of_scope_and_adversarial_questions_expect_refusal():
    questions = load_dataset()
    for q in questions:
        if q.category in ("out_of_scope", "adversarial"):
            assert q.expected_refusal is True, q.id


def test_in_scope_questions_do_not_expect_refusal():
    questions = load_dataset()
    for q in questions:
        if q.category not in ("out_of_scope", "adversarial"):
            assert q.expected_refusal is False, q.id


def test_default_dataset_path_resolves_under_repo_evaluation_dir():
    assert DEFAULT_DATASET_PATH.name == "dataset.json"
    assert DEFAULT_DATASET_PATH.parent.name == "evaluation"
    assert DEFAULT_DATASET_PATH.is_file()
