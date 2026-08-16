"""Manual verification aid for evaluation/dataset.json's ground_truth
answers.

The ground_truth values were authored from general 3GPP domain knowledge
(see dataset.json's "ground_truth_convention"), not copy-pasted from the
ingested PDFs — this script exists to let a human actually check that
domain knowledge against what's really in the indexed corpus, rather than
trusting that it "sounds right."

For a sample of factual/procedural questions, it runs the real retrieval
pipeline (backend.retrieval.pipeline.retrieve — the same dense+sparse+
fusion+reranking path production chat requests use) against the live
database and prints the question, its ground_truth, and the actual
retrieved chunk text side by side, so a reviewer can eyeball whether the
ground_truth is actually supported by real spec text.

This does not call the LLM and does not modify the database — read-only,
safe to run repeatedly.

Usage:
    python evaluation/verify_ground_truths.py
    python evaluation/verify_ground_truths.py --count 6 --category factual
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
from pathlib import Path

from backend.db import SessionLocal
from backend.retrieval.pipeline import retrieve

# Windows consoles default to a codepage that can't render "§" — force
# UTF-8 stdout so section references print correctly instead of "?"/mojibake.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"
TOP_K = 5
WRAP_WIDTH = 100


def load_questions() -> list[dict]:
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    return data["questions"]


def sample_questions(questions: list[dict], count: int, categories: list[str]) -> list[dict]:
    """Evenly split `count` across `categories`, in dataset order (not
    random) so a rerun is reproducible and easy to diff.
    """
    by_category = {cat: [q for q in questions if q["category"] == cat] for cat in categories}
    per_category = max(1, count // len(categories))
    sampled: list[dict] = []
    for cat in categories:
        sampled.extend(by_category[cat][:per_category])
    return sampled[:count]


def _wrap(text: str) -> str:
    return "\n".join(textwrap.wrap(text, width=WRAP_WIDTH)) or text


def print_side_by_side(question: dict) -> None:
    print("=" * WRAP_WIDTH)
    print(f"[{question['id']}] ({question['category']}) {question['question']}")
    print("-" * WRAP_WIDTH)
    print("GROUND TRUTH (authored from domain knowledge):")
    print(_wrap(question.get("ground_truth", "(none)")))
    print("-" * WRAP_WIDTH)

    with SessionLocal() as db:
        result = retrieve(db, question["question"], release=question.get("release"), top_k=TOP_K)

    if not result.chunks:
        print("RETRIEVED CHUNKS: none — evidence gate would refuse this question.")
        print(f"  (evidence gate reason: {result.evidence.reason})")
        return

    print(
        f"RETRIEVED CHUNKS (top {len(result.chunks)}, evidence_sufficient="
        f"{result.evidence.sufficient}, reason: {result.evidence.reason}):"
    )
    for i, chunk in enumerate(result.chunks, start=1):
        print(f"\n  [{i}] TS {chunk.spec_number} §{chunk.section} · page {chunk.page_start}-{chunk.page_end}")
        print(textwrap.indent(_wrap(chunk.content[:600]), "      "))
    print()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=10, help="Total questions to sample (default: 10)")
    parser.add_argument(
        "--category",
        action="append",
        dest="categories",
        help="Category to include (repeatable). Default: factual and procedural.",
    )
    args = parser.parse_args()
    categories = args.categories or ["factual", "procedural"]

    questions = load_questions()
    sample = sample_questions(questions, args.count, categories)

    print(f"Verifying {len(sample)} ground_truth answers against real retrieval "
          f"(categories: {', '.join(categories)})\n")
    for question in sample:
        print_side_by_side(question)


if __name__ == "__main__":
    main()
