"""Seeds the `queries` audit-log table with real runs of every question in
evaluation/dataset.json, tagged with their dataset question id.

This exists specifically so backend/evaluation/ragas_dataset.py's
build_ragas_rows_from_queries() has something real to join against: Ragas
scoring needs {question, contexts, answer, ground_truth} rows built from
*actual* pipeline output, not the dataset's canned text. Running this
script once (against a real running server, with specs already ingested)
populates that.

Calls the real, running /api/v1/chat endpoint over HTTP for every question
— not an in-process pipeline call — so the resulting Query rows are
produced by the exact same code path a real user's request would go
through, including request validation and rate limiting. Each request
includes the dataset question's `question_id`, which backend/api/chat.py
stores on the resulting Query row (see ChatRequest.question_id in
backend/api/schemas.py) — that id is what ragas_dataset.py later joins on,
rather than matching on question text.

Usage:
    python evaluation/seed_eval_queries.py
    python evaluation/seed_eval_queries.py --base-url http://localhost:8000 --limit 5
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import httpx

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stdout)
logger = logging.getLogger(__name__)

DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"
REQUEST_TIMEOUT_SECONDS = 120.0


def load_questions(limit: int | None = None) -> list[dict]:
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    questions = data["questions"]
    return questions[:limit] if limit else questions


def seed(base_url: str, limit: int | None = None) -> None:
    questions = load_questions(limit)
    logger.info("Seeding %d question(s) from %s against %s", len(questions), DATASET_PATH, base_url)

    answered = refused = failed = 0

    with httpx.Client(base_url=base_url, timeout=REQUEST_TIMEOUT_SECONDS) as client:
        for i, q in enumerate(questions, start=1):
            payload = {
                "question": q["question"],
                "release": q.get("release"),
                "question_id": q["id"],
            }
            t0 = time.perf_counter()
            try:
                response = client.post("/api/v1/chat", json=payload)
                response.raise_for_status()
            except httpx.HTTPError as exc:
                failed += 1
                logger.error("[%d/%d] %s FAILED: %s", i, len(questions), q["id"], exc)
                continue

            body = response.json()
            elapsed = time.perf_counter() - t0
            if body.get("grounded"):
                answered += 1
            else:
                refused += 1
            logger.info(
                "[%d/%d] %s (%s) grounded=%s latency=%.1fs",
                i,
                len(questions),
                q["id"],
                q["category"],
                body.get("grounded"),
                elapsed,
            )

    logger.info(
        "Done. answered=%d refused=%d failed=%d total=%d",
        answered,
        refused,
        failed,
        len(questions),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of a running backend instance (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only seed the first N questions (default: all 45)",
    )
    args = parser.parse_args()
    seed(args.base_url, args.limit)


if __name__ == "__main__":
    main()
