"""The required ablation (TRD §10): runs the full 45-question dataset
through three real pipeline configurations against the live system —

  1. basic_rag      — vector-only retrieval, no reranking, no evidence gate
  2. hybrid_rerank   — + hybrid (dense+sparse) retrieval + cross-encoder reranking
  3. full_system     — + evidence gate + citation validation + grounding validator

— to show what each guardrail layer actually buys over the naive baseline,
not just that the full pipeline demo works. Reuses the exact same variant
implementations (backend/evaluation/variants.py) the rest of the eval
system uses, so this isn't a separate, drifting reimplementation.

For each variant, logs Hallucination Rate (fresh grounding-validator
check), Faithfulness (via Ragas — see ragas_runner.py), and Recall@5 to
evaluation/ablation_results.json.

This is expensive: 45 questions x 3 variants, each involving a real LLM
generation call, a real independent grounding-validator call (for
hallucination), and — for non-refused answers with a ground_truth — a real
Ragas Faithfulness call. That's on the order of a few hundred live LLM
calls total. Use --limit while testing.

Usage:
    python evaluation/run_ablation.py --limit 3
    python evaluation/run_ablation.py            # full 45-question run
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path

from backend.db import SessionLocal
from backend.evaluation.dataset import load_dataset
from backend.evaluation.generation_metrics import judge_hallucination
from backend.evaluation.ragas_runner import run_ragas_eval
from backend.evaluation.retrieval_metrics import aggregate_retrieval_metrics, chunk_gold_key
from backend.evaluation.variants import VARIANTS
from backend.generation.llm_client import get_default_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
logger = logging.getLogger(__name__)

RESULTS_PATH = Path(__file__).resolve().parent / "ablation_results.json"


def run_variant_ablation(variant_name: str, questions: list) -> dict:
    variant_fn = VARIANTS[variant_name]
    db = SessionLocal()
    client = get_default_client()

    answered = 0
    hallucinated = 0
    ragas_rows: list[dict] = []
    scored_pairs: list[tuple[list[str], list[str]]] = []

    try:
        for i, question in enumerate(questions, start=1):
            output = variant_fn(db, client, question)
            logger.info("[%s] %d/%d %s refused=%s", variant_name, i, len(questions), question.id, output.refused)

            if output.refused:
                continue
            answered += 1

            if judge_hallucination(client, output.answer, output.chunks):
                hallucinated += 1

            if question.ground_truth:
                ragas_rows.append(
                    {
                        "question": question.question,
                        "contexts": [c.content for c in output.chunks],
                        "answer": output.answer,
                        "ground_truth": question.ground_truth,
                    }
                )

            if question.gold_sections:
                retrieved_keys = [chunk_gold_key(c.spec_number, c.section) for c in output.chunks]
                scored_pairs.append((retrieved_keys, question.gold_sections))
    finally:
        db.close()

    hallucination_rate = hallucinated / answered if answered else None

    faithfulness = None
    faithfulness_note = None
    if ragas_rows:
        try:
            faithfulness = run_ragas_eval(ragas_rows)["faithfulness"]
        except Exception as exc:  # noqa: BLE001 - don't let a Ragas failure lose the rest of this variant's results
            logger.exception("Ragas faithfulness scoring failed for variant %s", variant_name)
            faithfulness_note = f"Ragas scoring failed: {exc}"
    else:
        faithfulness_note = "No answered questions had a ground_truth to score against."

    retrieval_metrics = aggregate_retrieval_metrics(scored_pairs, k=5)
    recall_at_5 = retrieval_metrics.recall_at_k if retrieval_metrics else None
    recall_note = None if retrieval_metrics else (
        "Recall@5 not computed: no scored question had gold_sections populated "
        "(see dataset.json's gold_sections_convention)."
    )

    return {
        "variant_name": variant_name,
        "question_count": len(questions),
        "answered_count": answered,
        "hallucination_rate": hallucination_rate,
        "faithfulness": faithfulness,
        "faithfulness_note": faithfulness_note,
        "faithfulness_scored_count": len(ragas_rows),
        "recall_at_5": recall_at_5,
        "recall_scored_count": retrieval_metrics.scored_question_count if retrieval_metrics else 0,
        "recall_note": recall_note,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Only run the first N questions (default: all 45)")
    args = parser.parse_args()

    questions = load_dataset()
    if args.limit:
        questions = questions[: args.limit]

    logger.info("Running ablation over %d question(s) x %d variants", len(questions), len(VARIANTS))

    variants_result = [run_variant_ablation(name, questions) for name in ("basic_rag", "hybrid_rerank", "full_system")]

    payload = {
        "timestamp": datetime.now(UTC).isoformat(),
        "question_count": len(questions),
        "partial": len(questions) < len(load_dataset()),
        "variants": variants_result,
    }
    RESULTS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("Wrote %s", RESULTS_PATH)

    print("\n| Variant | Hallucination Rate | Faithfulness | Recall@5 |")
    print("|---|---|---|---|")
    for v in variants_result:
        hr = f"{v['hallucination_rate']:.2%}" if v["hallucination_rate"] is not None else "n/a"
        fa = f"{v['faithfulness']:.2f}" if v["faithfulness"] is not None else "n/a"
        rc = f"{v['recall_at_5']:.2f}" if v["recall_at_5"] is not None else "n/a"
        print(f"| {v['variant_name']} | {hr} | {fa} | {rc} |")


if __name__ == "__main__":
    main()
