"""Builds evaluation rows from the real `queries` audit-log table, joined
against the evaluation dataset's ground_truth answers.

This is separate from runner.py's ablation runner, which calls the
pipeline live and scores retrieval/citation/hallucination directly. This
module instead looks backward at what the running application has
*already* logged (backend/models.py Query rows, written by
backend/api/chat.py on every real chat request) and pairs each logged
query with a ground_truth answer from evaluation/dataset.json.

The join key is `Query.dataset_question_id`, stamped onto a Query row only
when the request that produced it carried a `question_id` (see
ChatRequest.question_id in backend/api/schemas.py) — which real product
traffic never sets. `evaluation/seed_eval_queries.py` is what populates
this: it runs all 45 dataset.json questions through the real /api/v1/chat
endpoint once, passing each question's id along, so their resulting Query
rows land tagged with it.

A row only counts as a real, scoreable "grounded answer" when
`grounding_verdict == "pass"` — the *only* value backend/generation/
pipeline.py ever writes for a query that passed evidence gating, citation
validation, AND the independent grounding validator (see `_refusal()` in
pipeline.py, which always sets grounding_verdict=None). Checking
`evidence_sufficient` alone is not enough: a query can pass the evidence
gate and still be refused afterwards for a bad citation or a failed
grounding check, in which case `generated_answer` holds the refusal
message, not a real answer — that was an earlier bug in this module, now
fixed by keying off `grounding_verdict` instead.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.evaluation.dataset import load_dataset
from backend.models import Chunk, Document, Query
from backend.retrieval.pipeline import assign_source_ids
from backend.retrieval.schemas import RetrievedChunk


@dataclass
class SeededQueryRow:
    """A logged, real, grounded query paired with its dataset ground_truth
    and its reconstructed retrieved chunks — enough to feed either Ragas
    (ragas_runner.run_ragas_eval) or a fresh re-check via the existing
    citation/hallucination functions in generation_metrics.py.
    """

    question_id: str
    question: str
    answer: str
    chunks: list[RetrievedChunk]
    ground_truth: str


def build_seeded_rows(db: Session, dataset_path: Path | None = None) -> list[SeededQueryRow]:
    """Returns one row per dataset question that has both a ground_truth
    and a matching, actually-grounded logged Query — using each dataset
    question's *most recent* seeded run if it was seeded more than once.
    """
    ground_truth_by_id = {q.id: q.ground_truth for q in load_dataset(dataset_path) if q.ground_truth}
    if not ground_truth_by_id:
        return []

    logged_queries = (
        db.execute(
            select(Query)
            .where(
                Query.dataset_question_id.in_(ground_truth_by_id.keys()),
                Query.grounding_verdict == "pass",
                Query.generated_answer.is_not(None),
            )
            .order_by(Query.dataset_question_id, Query.created_at.desc())
        )
        .scalars()
        .all()
    )

    rows: list[SeededQueryRow] = []
    seen_question_ids: set[str] = set()
    for query in logged_queries:
        # created_at DESC within each dataset_question_id group means the
        # first row seen per id is the most recent run — skip any earlier
        # (stale) reruns of the same dataset question.
        if query.dataset_question_id in seen_question_ids:
            continue
        seen_question_ids.add(query.dataset_question_id)

        chunks = _resolve_chunks(db, query.retrieved_chunk_ids)
        if not chunks:
            continue

        rows.append(
            SeededQueryRow(
                question_id=query.dataset_question_id,
                question=query.question,
                answer=query.generated_answer,
                chunks=chunks,
                ground_truth=ground_truth_by_id[query.dataset_question_id],
            )
        )
    return rows


def build_ragas_rows_from_queries(db: Session, dataset_path: Path | None = None) -> list[dict]:
    """Returns [{question, contexts, answer, ground_truth}, ...] ready for
    ragas_runner.run_ragas_eval. Thin wrapper over build_seeded_rows for
    callers that only need Ragas's plain-text row shape.
    """
    return [
        {
            "question": row.question,
            "contexts": [c.content for c in row.chunks],
            "answer": row.answer,
            "ground_truth": row.ground_truth,
        }
        for row in build_seeded_rows(db, dataset_path)
    ]


def _resolve_chunks(db: Session, chunk_ids: list[str]) -> list[RetrievedChunk]:
    """Rebuilds RetrievedChunk objects (with source_id reassigned in the
    same SRC-001, SRC-002, ... rank order used at generation time — see
    assign_source_ids) so the existing citation/grounding-validator
    functions, which expect that shape, can be re-run against a logged
    query's actual retrieved chunks.
    """
    if not chunk_ids:
        return []

    rows = db.execute(
        select(Chunk, Document.spec_number, Document.release)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.id.in_(chunk_ids))
    ).all()

    by_id = {
        str(chunk.id): RetrievedChunk(
            chunk_id=str(chunk.id),
            document_id=str(chunk.document_id),
            spec_number=spec_number,
            release=release,
            section=chunk.section,
            subsection=chunk.subsection,
            section_title=chunk.section_title,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            content=chunk.content,
            parent_context=chunk.parent_context,
        )
        for chunk, spec_number, release in rows
    }
    # Preserve retrieval order (chunk_ids is rank-ordered), then reassign
    # source_id in that same order.
    ordered = [by_id[chunk_id] for chunk_id in chunk_ids if chunk_id in by_id]
    assign_source_ids(ordered)
    return ordered
