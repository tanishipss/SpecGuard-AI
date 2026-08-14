import logging
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.config import settings
from backend.embedding import embed_texts
from backend.ingestion.chunker import chunk_document
from backend.ingestion.parser import compute_document_hash, parse_pdf
from backend.ingestion.quality import check_chunks
from backend.models import Chunk, Document

logger = logging.getLogger(__name__)


@dataclass
class IngestResult:
    document_id: str
    skipped: bool
    chunk_count: int
    quality_issue_count: int


def ingest_pdf(
    db: Session,
    path: Path,
    *,
    spec_number: str,
    release: str,
    version: str,
    title: str | None = None,
) -> IngestResult:
    """Ingest one 3GPP spec PDF end-to-end: parse -> chunk -> quality check
    -> embed -> persist. Skips re-ingestion if the file's content hash
    already matches a stored document (change detection).
    """
    document_hash = compute_document_hash(path)
    existing = db.execute(select(Document).where(Document.document_hash == document_hash)).scalar_one_or_none()
    if existing is not None:
        logger.info("Skipping %s — unchanged (hash %s already ingested)", path, document_hash[:12])
        chunk_count = db.execute(
            select(func.count()).select_from(Chunk).where(Chunk.document_id == existing.id)
        ).scalar_one()
        return IngestResult(str(existing.id), skipped=True, chunk_count=chunk_count, quality_issue_count=0)

    parsed = parse_pdf(path, spec_number=spec_number, release=release, version=version, title=title)

    document_id = uuid.uuid4()
    document = Document(
        id=document_id,
        spec_number=parsed.spec_number,
        title=parsed.title,
        release=parsed.release,
        version=parsed.version,
        source_file=parsed.source_file,
        document_hash=parsed.document_hash,
    )
    db.add(document)

    candidates = chunk_document(
        parsed,
        str(document_id),
        min_tokens=settings.chunk_min_tokens,
        max_tokens=settings.chunk_max_tokens,
        overlap_tokens=settings.chunk_overlap_tokens,
    )

    issues = check_chunks(candidates, max_tokens=settings.chunk_max_tokens)
    for issue in issues:
        logger.warning("Quality issue in %s chunk %d: %s", path, issue.chunk_index, issue.reason)

    embeddings = embed_texts([c.content for c in candidates])

    for candidate, embedding in zip(candidates, embeddings, strict=False):
        db.add(
            Chunk(
                id=uuid.uuid4(),
                document_id=document_id,
                section=candidate.section,
                subsection=candidate.subsection,
                section_title=candidate.section_title,
                page_start=candidate.page_start,
                page_end=candidate.page_end,
                content=candidate.content,
                parent_context=candidate.parent_context,
                embedding=embedding,
                embedding_model_version=settings.embedding_model,
                token_count=candidate.token_count,
            )
        )

    db.commit()

    return IngestResult(
        str(document_id),
        skipped=False,
        chunk_count=len(candidates),
        quality_issue_count=len(issues),
    )
