import json
import logging
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.api.schemas import EvalRunResponse
from backend.config import settings
from backend.db import get_db
from backend.evaluation.dataset import REPO_ROOT, load_dataset
from backend.evaluation.generation_metrics import citation_correct, judge_hallucination
from backend.evaluation.ragas_dataset import build_seeded_rows
from backend.evaluation.ragas_runner import run_ragas_eval
from backend.evaluation.retrieval_metrics import aggregate_retrieval_metrics, chunk_gold_key
from backend.generation.llm_client import get_default_client
from backend.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

RESULTS_PATH = REPO_ROOT / "evaluation" / "results.json"
ABLATION_RESULTS_PATH = REPO_ROOT / "evaluation" / "ablation_results.json"


@router.get("/eval/ablation")
def get_ablation_results() -> dict:
    """Serves evaluation/ablation_results.json (written by the offline
    evaluation/run_ablation.py script) so the frontend can render it — the
    browser can't read a backend file directly. Honestly reports "not yet
    run" rather than fabricating a response when the file doesn't exist.
    """
    if not ABLATION_RESULTS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Ablation has not been run yet. Run `python evaluation/run_ablation.py`.",
        )
    return json.loads(ABLATION_RESULTS_PATH.read_text(encoding="utf-8"))


@router.get("/eval/run", response_model=EvalRunResponse)
@limiter.limit(settings.rate_limit_eval)
def run_eval(request: Request, db: Session = Depends(get_db)) -> EvalRunResponse:
    """Scores whatever evaluation/dataset.json questions have already been
    seeded into the `queries` table (see evaluation/seed_eval_queries.py)
    with Ragas (Faithfulness, Answer Relevance, Context Precision — see
    ragas_runner.py's docstring for why "Context Relevance" is reported
    from context_precision), a fresh deterministic citation-correctness
    check, a fresh grounding-validator hallucination check, and Precision@5
    against dataset.json's gold_sections (currently unpopulated — see
    dataset.json's "gold_sections_convention" — so this is honestly
    reported as 0-scored rather than faked).

    Explicitly flags a partial run (fewer than 45 questions scored) rather
    than silently presenting incomplete numbers as a finished evaluation.
    """
    dataset_questions = load_dataset()
    total_dataset_questions = len(dataset_questions)

    seeded_rows = build_seeded_rows(db)
    scored_question_count = len(seeded_rows)
    partial = scored_question_count < total_dataset_questions

    if not seeded_rows:
        response = EvalRunResponse(
            timestamp=_now_iso(),
            total_dataset_questions=total_dataset_questions,
            scored_question_count=0,
            partial=True,
            citation_correctness_rate=None,
            hallucination_rate=None,
            precision_at_5=None,
            recall_at_5=None,
            mrr=None,
            precision_scored_question_count=0,
            faithfulness=None,
            answer_relevance=None,
            context_relevance=None,
            message=(
                "No seeded evaluation queries found. Run "
                "`python evaluation/seed_eval_queries.py` against a running "
                "backend first, then retry this endpoint."
            ),
        )
        _save_results(response)
        return response

    citation_correctness_rate = sum(
        1 for row in seeded_rows if citation_correct(row.answer, row.chunks)
    ) / len(seeded_rows)

    hallucination_rate, hallucination_note = _compute_hallucination_rate(seeded_rows)

    precision_at_5, recall_at_5, mrr, precision_scored_question_count, precision_note = (
        _compute_retrieval_metrics(seeded_rows, dataset_questions)
    )

    faithfulness = answer_relevance = context_relevance = None
    ragas_note = None
    try:
        ragas_rows = [
            {
                "question": row.question,
                "contexts": [c.content for c in row.chunks],
                "answer": row.answer,
                "ground_truth": row.ground_truth,
            }
            for row in seeded_rows
        ]
        ragas_scores = run_ragas_eval(ragas_rows)
        faithfulness = ragas_scores["faithfulness"]
        answer_relevance = ragas_scores["answer_relevance"]
        context_relevance = ragas_scores["context_relevance"]
    except Exception as exc:  # noqa: BLE001 - a Ragas/LLM failure shouldn't 500 the whole endpoint
        logger.exception("Ragas evaluation failed")
        ragas_note = f"Ragas scoring failed: {exc}"

    notes = [n for n in (hallucination_note, precision_note, ragas_note) if n]
    message = (
        f"Scored {scored_question_count}/{total_dataset_questions} dataset questions "
        f"({'partial' if partial else 'complete'} run)."
    )
    if notes:
        message += " " + " ".join(notes)

    response = EvalRunResponse(
        timestamp=_now_iso(),
        total_dataset_questions=total_dataset_questions,
        scored_question_count=scored_question_count,
        partial=partial,
        citation_correctness_rate=citation_correctness_rate,
        hallucination_rate=hallucination_rate,
        precision_at_5=precision_at_5,
        recall_at_5=recall_at_5,
        mrr=mrr,
        precision_scored_question_count=precision_scored_question_count,
        faithfulness=faithfulness,
        answer_relevance=answer_relevance,
        context_relevance=context_relevance,
        message=message,
    )
    _save_results(response)
    return response


def _compute_hallucination_rate(seeded_rows) -> tuple[float | None, str | None]:
    """Re-runs the real, independent grounding validator (TRD §7.4) fresh
    against each seeded row's reconstructed chunks — the same function
    (`judge_hallucination`) the 3-variant ablation uses — rather than
    trusting the `grounding_verdict` stored at generation time, so this
    reflects the guardrail's current behavior even if prompts/model
    changed since a row was seeded.
    """
    try:
        client = get_default_client()
    except Exception as exc:  # noqa: BLE001
        return None, f"Hallucination re-check skipped: {exc}"

    hallucinated = 0
    for row in seeded_rows:
        if judge_hallucination(client, row.answer, row.chunks):
            hallucinated += 1
    return hallucinated / len(seeded_rows), None


def _compute_retrieval_metrics(
    seeded_rows, dataset_questions
) -> tuple[float | None, float | None, float | None, int, str | None]:
    """Precision@5, Recall@5, and MRR (TRD §10) computed together from the
    same (retrieved_keys, gold_keys) pairs — they share one scored subset
    (questions with populated gold_sections), so there's no reason to run
    aggregate_retrieval_metrics three times for three numbers.
    """
    gold_by_id = {q.id: q.gold_sections for q in dataset_questions if q.gold_sections}
    if not gold_by_id:
        return (
            None,
            None,
            None,
            0,
            "Precision@5/Recall@5/MRR not computed: no dataset.json question has gold_sections "
            "populated yet (see dataset.json's gold_sections_convention).",
        )

    scored_pairs = []
    for row in seeded_rows:
        gold = gold_by_id.get(row.question_id)
        if not gold:
            continue
        retrieved_keys = [chunk_gold_key(c.spec_number, c.section) for c in row.chunks]
        scored_pairs.append((retrieved_keys, gold))

    metrics = aggregate_retrieval_metrics(scored_pairs, k=5)
    if metrics is None:
        return (
            None,
            None,
            None,
            0,
            "Precision@5/Recall@5/MRR not computed: none of the seeded questions have gold_sections populated.",
        )
    return metrics.precision_at_k, metrics.recall_at_k, metrics.mrr, metrics.scored_question_count, None


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _save_results(response: EvalRunResponse, path: Path | None = None) -> None:
    path = path or RESULTS_PATH
    path.write_text(json.dumps(response.model_dump(), indent=2), encoding="utf-8")
