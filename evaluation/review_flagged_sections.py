"""Manual read-through aid for the 12 gold_sections questions flagged as
low-confidence in the last retrieval-candidate pass (see
gold_sections_review.html).

Those questions weren't given a proposed gold_sections pick because the
reranker's scores didn't clearly separate a winner, or the top hit looked
like a TOC/definitions section, or (for q021/q022) the question is a
comparison type where no single chunk obviously answers it. Re-scoring
them from the same retrieval output would be circular, so instead this
prints each candidate's FULL chunk text (not just its rerank score) so a
human can actually read the source clause and decide.

For q021 and q022 (comparison questions), it also prints q001's and
q002's currently-confirmed gold_sections chunks alongside the new
candidates, in case the comparison answer is just the union of two
already-confirmed answers rather than a new section.

This does not call the LLM and does not modify dataset.json or the
database — read-only, safe to run repeatedly.

Usage:
    python evaluation/review_flagged_sections.py
"""

from __future__ import annotations

import json
import sys
import textwrap
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.models import Chunk, Document

# Windows consoles default to a codepage that can't render "§" — force
# UTF-8 stdout so section references print correctly instead of "?"/mojibake.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

DATASET_PATH = Path(__file__).resolve().parent / "dataset.json"
OUTPUT_PATH = Path(__file__).resolve().parent / "flagged_sections_review.txt"
WRAP_WIDTH = 100

# Candidate section IDs surfaced in the prior retrieval pass (see
# gold_sections_review.html) for each flagged question. These are carried
# over verbatim, not re-derived, so this script stays a pure "read the
# source text" step rather than a second retrieval pass.
FLAGGED_CANDIDATES: dict[str, list[str]] = {
    "q002": ["23.502#5.2.8.2.9", "23.501#5.15.5.3", "23.501#5.34.3"],
    "q005": ["23.501#4.1", "23.501#4.2.2", "23.501#5.15.8"],
    "q007": ["23.501#4.2.8.3.1", "23.501#4.4.2.2", "23.501#4.2.8.5.4"],
    "q010": ["23.501#5.15.2.1", "23.501#5.19.7.4", "23.502#5.2.3.3.1"],
    "q011": ["23.502#4.11.1.3.3", "23.502#4.23.13.3", "23.502#4.11.2.3"],
    "q013": ["23.502#4.23.12.8.6", "23.502#4.2.7.2.2", "23.502#4.9.1.2.1"],
    "q017": ["23.502#3", "23.502#4.3.2.2.2", "23.502#4.3.4.3"],
    "q021": ["23.502#4.23.7.2.2", "23.502#4.23.7.2.3", "23.501#5.6.2"],
    "q022": ["23.501#5.32.4", "23.501#5.31.19", "23.501#5.7.1.1"],
    "q025": ["23.501#5.7.1.1", "23.501#5.22.1", "23.501#5.32.4"],
    "q027": ["23.501#5.34.7.1", "23.502#4.9.1.2.2"],
    "q029": ["23.501#5.15.5.3", "23.501#5.15.12.2", "23.502#4.3.2.2.3.2"],
}

# For comparison questions, the prior question(s) whose confirmed
# gold_sections might already cover the comparison by themselves.
COMPARISON_PRIOR_QUESTIONS: dict[str, list[str]] = {
    "q021": ["q001", "q002"],
    "q022": ["q001", "q002"],
}


def load_dataset() -> dict:
    return json.loads(DATASET_PATH.read_text(encoding="utf-8"))


def load_question(dataset: dict, question_id: str) -> dict | None:
    return next((q for q in dataset["questions"] if q["id"] == question_id), None)


def _wrap(text: str) -> str:
    return "\n".join(textwrap.wrap(text, width=WRAP_WIDTH)) or text


def fetch_chunk(db: Session, section_id: str, release: str) -> Chunk | None:
    """section_id is a 'spec_number#section' key, e.g. '23.502#4.2.1'."""
    spec_number, _, section = section_id.partition("#")
    return db.execute(
        select(Chunk)
        .join(Document, Chunk.document_id == Document.id)
        .where(
            Document.spec_number == spec_number,
            Document.release == release,
            Chunk.section == section,
        )
    ).scalars().first()


def render_chunk(out: list[str], section_id: str, chunk: Chunk | None) -> None:
    out.append(f"  --- {section_id} ---")
    if chunk is None:
        out.append("  (no chunk found in the live DB for this section id — check the id is correct)")
        return
    out.append(f"  {chunk.section_title}  (page {chunk.page_start}-{chunk.page_end})")
    out.append(textwrap.indent(_wrap(chunk.content), "  "))


def render_question(out: list[str], db: Session, dataset: dict, question_id: str) -> None:
    question = load_question(dataset, question_id)
    if question is None:
        out.append(f"[{question_id}] not found in dataset.json — skipping")
        return

    out.append("=" * WRAP_WIDTH)
    out.append(f"[{question_id}] ({question['category']}) {question['question']}")
    out.append("-" * WRAP_WIDTH)
    out.append("CANDIDATES (full chunk text, read to confirm — not just a score):")
    for section_id in FLAGGED_CANDIDATES[question_id]:
        render_chunk(out, section_id, fetch_chunk(db, section_id, question["release"]))
        out.append("")

    for prior_id in COMPARISON_PRIOR_QUESTIONS.get(question_id, []):
        prior = load_question(dataset, prior_id)
        if prior is None:
            continue
        confirmed = prior.get("gold_sections") or []
        out.append(f"CONFIRMED SECTIONS FOR {prior_id} ({prior['question']}):")
        if not confirmed:
            out.append(f"  ({prior_id} has no confirmed gold_sections yet — nothing to compare against)")
        else:
            for section_id in confirmed:
                render_chunk(out, section_id, fetch_chunk(db, section_id, prior["release"]))
                out.append("")

    out.append("")


def main() -> None:
    dataset = load_dataset()
    out: list[str] = [
        "Flagged gold_sections review — full chunk text for manual read-through.",
        "Read-only: this script does not modify dataset.json or the database.",
        "",
    ]

    with SessionLocal() as db:
        for question_id in FLAGGED_CANDIDATES:
            render_question(out, db, dataset, question_id)

    OUTPUT_PATH.write_text("\n".join(out), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
