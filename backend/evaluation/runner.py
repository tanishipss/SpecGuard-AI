from sqlalchemy.orm import Session

from backend.evaluation.generation_metrics import aggregate_generation_metrics, citation_correct, judge_hallucination
from backend.evaluation.retrieval_metrics import aggregate_retrieval_metrics, chunk_gold_key
from backend.evaluation.schemas import EvalCaseResult, EvalQuestion, EvalRunResult
from backend.evaluation.variants import VARIANTS
from backend.generation.llm_client import LLMClient

# Recall@5 / Precision@5 / MRR are reported at a fixed k regardless of a
# variant's own top_k, so numbers are comparable across the ablation rows.
EVAL_K = 5


def run_variant(db: Session, client: LLMClient, questions: list[EvalQuestion], variant_name: str) -> EvalRunResult:
    variant_fn = VARIANTS[variant_name]
    cases: list[EvalCaseResult] = []
    scored_pairs: list[tuple[list[str], list[str]]] = []

    for question in questions:
        output = variant_fn(db, client, question)
        retrieved_keys = [chunk_gold_key(c.spec_number, c.section) for c in output.chunks]

        if output.refused:
            hallucinated = None
            valid_citation = None
        else:
            hallucinated = judge_hallucination(client, output.answer, output.chunks)
            valid_citation = citation_correct(output.answer, output.chunks)

        cases.append(
            EvalCaseResult(
                question_id=question.id,
                category=question.category,
                question=question.question,
                expected_refusal=question.expected_refusal,
                refused=output.refused,
                answer=output.answer,
                retrieved_keys=retrieved_keys,
                citation_valid=valid_citation,
                hallucinated=hallucinated,
            )
        )

        if question.gold_sections:
            scored_pairs.append((retrieved_keys, question.gold_sections))

    return EvalRunResult(
        variant_name=variant_name,
        cases=cases,
        generation_metrics=aggregate_generation_metrics(cases),
        retrieval_metrics=aggregate_retrieval_metrics(scored_pairs, k=EVAL_K),
    )


def run_ablation(db: Session, client: LLMClient, questions: list[EvalQuestion]) -> list[EvalRunResult]:
    """The required ablation (TRD §10): basic RAG -> +hybrid+rerank ->
    +full guardrails, run over the same question set so the deltas are
    attributable to each added layer rather than to different questions.
    """
    return [run_variant(db, client, questions, name) for name in ("basic_rag", "hybrid_rerank", "full_system")]


def render_ablation_table(runs: list[EvalRunResult]) -> str:
    header = "| Variant | Hallucination Rate | Citation Correctness | Refusal Accuracy | Recall@5 |"
    separator = "|---|---|---|---|---|"
    rows = [header, separator]
    for run in runs:
        gm = run.generation_metrics
        recall = f"{run.retrieval_metrics.recall_at_k:.2f}" if run.retrieval_metrics else "n/a"
        rows.append(
            f"| {run.variant_name} | {gm.hallucination_rate:.2%} | "
            f"{gm.citation_correctness_rate:.2%} | {gm.refusal_accuracy:.2%} | {recall} |"
        )
    return "\n".join(rows)
