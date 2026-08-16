from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from backend.api.schemas import (
    DocumentDetailOut,
    DocumentOut,
    DocumentSearchResultOut,
    DocumentSectionOut,
    IngestRequest,
    IngestResponse,
)
from backend.db import get_db
from backend.ingestion.pipeline import ingest_pdf
from backend.models import Chunk, Document

router = APIRouter()

SEARCH_SNIPPET_CHARS = 280
SEARCH_RESULT_LIMIT = 20


@router.post("/ingest", response_model=IngestResponse)
def ingest(request: IngestRequest, db: Session = Depends(get_db)) -> IngestResponse:
    path = Path(request.file_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail=f"file not found: {request.file_path}")

    result = ingest_pdf(
        db,
        path,
        spec_number=request.spec_number,
        release=request.release,
        version=request.version,
        title=request.title,
    )
    return IngestResponse(
        document_id=result.document_id,
        skipped=result.skipped,
        chunk_count=result.chunk_count,
        quality_issue_count=result.quality_issue_count,
    )


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)) -> list[DocumentOut]:
    documents = db.execute(select(Document).order_by(Document.ingested_at.desc())).scalars().all()
    counts = dict(
        db.execute(select(Chunk.document_id, func.count()).group_by(Chunk.document_id)).all()
    )
    return [
        DocumentOut(
            id=str(d.id),
            spec_number=d.spec_number,
            title=d.title,
            release=d.release,
            version=d.version,
            ingested_at=d.ingested_at,
            chunk_count=counts.get(d.id, 0),
        )
        for d in documents
    ]


@router.get("/documents/{document_id}", response_model=DocumentDetailOut)
def get_document(document_id: str, db: Session = Depends(get_db)) -> DocumentDetailOut:
    """Document exploration view (TRD knowledge-base UI) — read-only, reuses
    the chunks already produced by ingestion. Ordered by page_start/page_end,
    the true document reading order, since chunk rows carry no explicit
    sequence column.
    """
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail=f"document not found: {document_id}")

    chunks = (
        db.execute(
            select(Chunk)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.page_start, Chunk.page_end)
        )
        .scalars()
        .all()
    )

    return DocumentDetailOut(
        id=str(document.id),
        spec_number=document.spec_number,
        title=document.title,
        release=document.release,
        version=document.version,
        ingested_at=document.ingested_at,
        chunk_count=len(chunks),
        sections=[
            DocumentSectionOut(
                chunk_id=str(c.id),
                section=c.section,
                subsection=c.subsection,
                section_title=c.section_title,
                page_start=c.page_start,
                page_end=c.page_end,
                content=c.content,
                token_count=c.token_count,
            )
            for c in chunks
        ],
    )


@router.get("/documents/{document_id}/search", response_model=list[DocumentSearchResultOut])
def search_document(
    document_id: str,
    q: str = Query(min_length=1, max_length=200),
    db: Session = Depends(get_db),
) -> list[DocumentSearchResultOut]:
    """In-document lexical search — reuses the chunks.tsv full-text column
    already computed at ingestion time, scoped to one document. Deliberately
    not the retrieval pipeline (no dense/sparse fusion, reranking, or
    evidence gate): this is a simple "find it in this spec" tool, not RAG.
    """
    rows = db.execute(
        select(Chunk)
        .where(
            Chunk.document_id == document_id,
            Chunk.tsv.op("@@")(func.websearch_to_tsquery("english", q)),
        )
        .order_by(
            text("ts_rank(tsv, websearch_to_tsquery('english', :q)) DESC"),
        )
        .params(q=q)
        .limit(SEARCH_RESULT_LIMIT)
    ).scalars().all()

    return [
        DocumentSearchResultOut(
            chunk_id=str(c.id),
            section=c.section,
            subsection=c.subsection,
            section_title=c.section_title,
            page_start=c.page_start,
            page_end=c.page_end,
            snippet=c.content[:SEARCH_SNIPPET_CHARS],
        )
        for c in rows
    ]
