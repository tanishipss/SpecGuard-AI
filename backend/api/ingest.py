from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.api.schemas import DocumentOut, IngestRequest, IngestResponse
from backend.db import get_db
from backend.ingestion.pipeline import ingest_pdf
from backend.models import Document

router = APIRouter()


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
    return [DocumentOut.model_validate(d) for d in documents]
