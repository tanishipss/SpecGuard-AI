"""Lightweight 10-question eval against the full production pipeline only
(no 3-variant ablation — that's the 45-question run explicitly deferred
until after the demo). Concurrency capped at 3 LLM calls in flight; each
worker gets its own DB session (SQLAlchemy Session is not thread-safe).
Retrieval metrics (Recall@k/Precision@k/MRR) and citation validity are
computed locally with no LLM call; only answer generation and grounding
validation call the model.
"""

import csv
import json
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from backend.db import SessionLocal
from backend.embedding import _get_model as _get_embedding_model
from backend.evaluation.retrieval_metrics import chunk_gold_key, recall_at_k, precision_at_k, reciprocal_rank
from backend.generation.citation import validate_citations
from backend.generation.grounding import check_grounding
from backend.generation.llm_client import get_default_client
from backend.generation.pipeline import generate_answer
from backend.retrieval.pipeline import retrieve
from backend.retrieval.reranker import _get_model as _get_reranker_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
logger = logging.getLogger(__name__)

DATASET_PATH = Path("evaluation/lite_dataset.json")
RESULTS_JSON_PATH = Path("evaluation/lite_results.json")
RESULTS_CSV_PATH = Path("evaluation/lite_results.csv")
EVAL_K = 5
MAX_CONCURRENT_LLM_CALLS = 3


def load_lite_dataset() -> list[dict]:
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    return data["questions"]


def run_one(question: dict) -> dict:
    db = SessionLocal()
    client = get_default_client()
    try:
        t0 = time.perf_counter()
        retrieval_result = retrieve(db, question["question"], release=question.get("release"))
        generation_result = generate_answer(retrieval_result, llm_client=client)
        latency_s = time.perf_counter() - t0

        retrieved_keys = [chunk_gold_key(c.spec_number, c.section) for c in retrieval_result.chunks]
        gold_keys = question.get("gold_sections") or []

        retrieval_metrics = None
        if gold_keys:
            retrieval_metrics = {
                "recall_at_5": recall_at_k(retrieved_keys, gold_keys, EVAL_K),
                "precision_at_5": precision_at_k(retrieved_keys, gold_keys, EVAL_K),
                "mrr": reciprocal_rank(retrieved_keys, gold_keys),
            }

        citation_valid = None
        hallucinated = None
        if not generation_result.refused:
            # Citation validity is a deterministic parse — no LLM call.
            citation_valid = validate_citations(generation_result.answer, retrieval_result.chunks).valid
            # Grounding is the one LLM call besides generation itself.
            verdict = check_grounding(client, generation_result.answer, retrieval_result.chunks)
            hallucinated = verdict.verdict != "pass"

        result = {
            "id": question["id"],
            "category": question["category"],
            "question": question["question"],
            "expected_refusal": question["expected_refusal"],
            "refused": generation_result.refused,
            "refusal_correct": generation_result.refused == question["expected_refusal"],
            "answer": generation_result.answer,
            "retrieved_keys": retrieved_keys,
            "retrieval_metrics": retrieval_metrics,
            "citation_valid": citation_valid,
            "hallucinated": hallucinated,
            "latency_s": round(latency_s, 2),
        }
        logger.info(
            "%s [%s] refused=%s (expected=%s) latency=%.1fs",
            question["id"],
            question["category"],
            generation_result.refused,
            question["expected_refusal"],
            latency_s,
        )
        return result
    finally:
        db.close()


def main() -> None:
    questions = load_lite_dataset()
    results = []

    # Pre-warm the embedding/reranker models in the main thread before
    # spawning workers — @lru_cache on their loaders isn't safe against
    # multiple threads racing to construct the model on first use (this
    # crashed with a "meta tensor" error from concurrent SentenceTransformer
    # construction the first time this ran with 3 fresh worker threads).
    logger.info("Pre-warming embedding + reranker models...")
    _get_embedding_model()
    _get_reranker_model()
    get_default_client()
    logger.info("Models warm — starting %d questions with %d concurrent workers", len(questions), MAX_CONCURRENT_LLM_CALLS)

    t_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_LLM_CALLS) as pool:
        futures = {pool.submit(run_one, q): q["id"] for q in questions}
        for future in as_completed(futures):
            results.append(future.result())
    total_time = time.perf_counter() - t_start

    results.sort(key=lambda r: r["id"])

    n = len(results)
    refusal_accuracy = sum(1 for r in results if r["refusal_correct"]) / n
    answered = [r for r in results if not r["refused"]]
    citation_correctness = (
        sum(1 for r in answered if r["citation_valid"]) / len(answered) if answered else None
    )
    hallucination_rate = (
        sum(1 for r in answered if r["hallucinated"]) / len(answered) if answered else None
    )
    scored = [r for r in results if r["retrieval_metrics"]]
    avg_recall = sum(r["retrieval_metrics"]["recall_at_5"] for r in scored) / len(scored) if scored else None
    avg_mrr = sum(r["retrieval_metrics"]["mrr"] for r in scored) / len(scored) if scored else None

    summary = {
        "question_count": n,
        "total_wall_time_s": round(total_time, 1),
        "refusal_accuracy": refusal_accuracy,
        "citation_correctness_rate": citation_correctness,
        "hallucination_rate": hallucination_rate,
        "avg_recall_at_5": avg_recall,
        "avg_mrr": avg_mrr,
        "scored_question_count": len(scored),
    }

    RESULTS_JSON_PATH.write_text(
        json.dumps({"summary": summary, "cases": results}, indent=2), encoding="utf-8"
    )

    with RESULTS_CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["id", "category", "refused", "expected_refusal", "refusal_correct",
             "citation_valid", "hallucinated", "recall_at_5", "mrr", "latency_s"]
        )
        for r in results:
            rm = r["retrieval_metrics"] or {}
            writer.writerow(
                [r["id"], r["category"], r["refused"], r["expected_refusal"], r["refusal_correct"],
                 r["citation_valid"], r["hallucinated"], rm.get("recall_at_5"), rm.get("mrr"), r["latency_s"]]
            )

    print("\n=== SUMMARY ===")
    print(json.dumps(summary, indent=2))
    print(f"Wrote {RESULTS_JSON_PATH} and {RESULTS_CSV_PATH}")
    print("LITE_EVAL_DONE")


if __name__ == "__main__":
    main()
