from backend.evaluation.generation_metrics import aggregate_generation_metrics, citation_correct, judge_hallucination
from backend.evaluation.schemas import EvalCaseResult
from backend.retrieval.schemas import RetrievedChunk


def make_chunk(source_id: str = "SRC-001") -> RetrievedChunk:
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


class FakeClient:
    def __init__(self, verdict="pass"):
        self._verdict = verdict

    def generate(self, *a, **k):
        raise NotImplementedError

    def generate_json(self, prompt):
        return {"verdict": self._verdict, "unsupported_claims": [] if self._verdict == "pass" else ["x"]}


def test_judge_hallucination_true_on_fail_verdict():
    assert judge_hallucination(FakeClient(verdict="fail"), "answer", [make_chunk()]) is True


def test_judge_hallucination_false_on_pass_verdict():
    assert judge_hallucination(FakeClient(verdict="pass"), "answer", [make_chunk()]) is False


def test_citation_correct_true_when_cited_id_resolves():
    assert citation_correct("According to [SRC-001], X.", [make_chunk("SRC-001")]) is True


def test_citation_correct_false_when_uncited():
    assert citation_correct("X is true.", [make_chunk("SRC-001")]) is False


def make_case(refused, expected_refusal, hallucinated=None, citation_valid=None) -> EvalCaseResult:
    return EvalCaseResult(
        question_id="q1",
        category="factual",
        question="q",
        expected_refusal=expected_refusal,
        refused=refused,
        answer="a",
        retrieved_keys=[],
        citation_valid=citation_valid,
        hallucinated=hallucinated,
    )


def test_aggregate_generation_metrics_ignores_refused_cases_for_hallucination_and_citation():
    cases = [
        make_case(refused=True, expected_refusal=True),
        make_case(refused=False, expected_refusal=False, hallucinated=False, citation_valid=True),
        make_case(refused=False, expected_refusal=False, hallucinated=True, citation_valid=False),
    ]
    metrics = aggregate_generation_metrics(cases)

    assert metrics.total_answers == 2  # only the two non-refused cases
    assert metrics.hallucination_rate == 0.5
    assert metrics.citation_correctness_rate == 0.5


def test_aggregate_generation_metrics_refusal_accuracy_over_all_cases():
    cases = [
        make_case(refused=True, expected_refusal=True),  # correct
        make_case(refused=False, expected_refusal=False, hallucinated=False, citation_valid=True),  # correct
        make_case(refused=False, expected_refusal=True, hallucinated=False, citation_valid=True),  # wrong: should've refused
    ]
    metrics = aggregate_generation_metrics(cases)

    assert abs(metrics.refusal_accuracy - (2 / 3)) < 1e-9


def test_aggregate_generation_metrics_all_refused_gives_zero_rates_not_division_error():
    cases = [make_case(refused=True, expected_refusal=True)]
    metrics = aggregate_generation_metrics(cases)

    assert metrics.total_answers == 0
    assert metrics.hallucination_rate == 0.0
    assert metrics.citation_correctness_rate == 0.0
    assert metrics.refusal_accuracy == 1.0


def test_aggregate_generation_metrics_empty_cases():
    metrics = aggregate_generation_metrics([])
    assert metrics.refusal_accuracy == 0.0
    assert metrics.total_answers == 0
