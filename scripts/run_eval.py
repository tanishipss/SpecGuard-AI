"""One-off script to run the full ablation eval (TRD §10) and write evaluation/results.json."""

import logging
import sys

from backend.db import SessionLocal
from backend.evaluation.dataset import load_dataset, save_results
from backend.evaluation.runner import render_ablation_table, run_ablation
from backend.generation.llm_client import get_default_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)


def main() -> None:
    db = SessionLocal()
    try:
        questions = load_dataset()
        print(f"Loaded {len(questions)} questions")
        client = get_default_client()
        runs = run_ablation(db, client, questions)
        save_results(runs)
        print(render_ablation_table(runs))
        print("EVAL_DONE")
    finally:
        db.close()


if __name__ == "__main__":
    main()
