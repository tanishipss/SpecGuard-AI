from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.api.schemas import EvalRunResponse, VariantMetricsOut
from backend.config import settings
from backend.db import get_db
from backend.evaluation.dataset import load_dataset, save_results
from backend.evaluation.runner import render_ablation_table, run_ablation
from backend.generation.llm_client import get_default_client
from backend.rate_limit import limiter

router = APIRouter()


@router.get("/eval/run", response_model=EvalRunResponse)
@limiter.limit(settings.rate_limit_eval)
def run_eval(request: Request, limit: int | None = None, db: Session = Depends(get_db)) -> EvalRunResponse:
    """Runs the full ablation (TRD §10) over evaluation/dataset.json and
    writes evaluation/results.json. Synchronous and LLM-call-heavy (3
    variants x question count, plus one grounding-judge call per
    non-refused answer) — pass `limit` for a quick smoke run.
    """
    questions = load_dataset()
    if limit:
        questions = questions[:limit]

    client = get_default_client()
    runs = run_ablation(db, client, questions)
    save_results(runs)

    variants = [
        VariantMetricsOut(
            variant_name=run.variant_name,
            hallucination_rate=run.generation_metrics.hallucination_rate,
            citation_correctness_rate=run.generation_metrics.citation_correctness_rate,
            refusal_accuracy=run.generation_metrics.refusal_accuracy,
            total_answers=run.generation_metrics.total_answers,
            recall_at_k=run.retrieval_metrics.recall_at_k if run.retrieval_metrics else None,
            precision_at_k=run.retrieval_metrics.precision_at_k if run.retrieval_metrics else None,
            mrr=run.retrieval_metrics.mrr if run.retrieval_metrics else None,
            scored_question_count=run.retrieval_metrics.scored_question_count if run.retrieval_metrics else 0,
        )
        for run in runs
    ]

    return EvalRunResponse(
        question_count=len(questions),
        variants=variants,
        ablation_table_markdown=render_ablation_table(runs),
    )
