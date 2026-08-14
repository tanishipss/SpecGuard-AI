from backend.evaluation.schemas import EvalCaseResult, GenerationMetrics
from backend.generation.citation import validate_citations
from backend.generation.grounding import check_grounding
from backend.generation.llm_client import LLMClient


def judge_hallucination(client: LLMClient, answer: str, chunks) -> bool:
    """True if the answer contains a claim unsupported by `chunks`.

    Deliberately reuses the same independent grounding validator the
    production pipeline uses post-generation (TRD §7.4) — the point of the
    ablation (§10) is to show that variants *without* this validator wired
    in actually do hallucinate more, so the judge measuring that must be
    independent of whichever variant produced the answer.
    """
    verdict = check_grounding(client, answer, chunks)
    return verdict.verdict != "pass"


def citation_correct(answer: str, chunks) -> bool:
    return validate_citations(answer, chunks).valid


def aggregate_generation_metrics(cases: list[EvalCaseResult]) -> GenerationMetrics:
    answered = [c for c in cases if not c.refused]
    total_answers = len(answered)

    hallucinated_count = sum(1 for c in answered if c.hallucinated)
    citation_correct_count = sum(1 for c in answered if c.citation_valid)
    refusal_correct_count = sum(1 for c in cases if c.refused == c.expected_refusal)

    return GenerationMetrics(
        hallucination_rate=hallucinated_count / total_answers if total_answers else 0.0,
        citation_correctness_rate=citation_correct_count / total_answers if total_answers else 0.0,
        refusal_accuracy=refusal_correct_count / len(cases) if cases else 0.0,
        total_answers=total_answers,
    )
