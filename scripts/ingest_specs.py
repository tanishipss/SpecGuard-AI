"""One-off script to ingest the three TS 23.501/23.502/23.503 Rel-17 PDFs into Neon."""

import logging
import sys
from pathlib import Path

from backend.db import SessionLocal
from backend.ingestion.manifest import is_completed
from backend.ingestion.pipeline import ingest_pdf

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)

SPECS = [
    {"path": "docs/specs/ts_123501v171500p.pdf", "spec_number": "23.501", "release": "Rel-17", "version": "17.15.0"},
    {"path": "docs/specs/ts_123502v171500p.pdf", "spec_number": "23.502", "release": "Rel-17", "version": "17.15.0"},
    {"path": "docs/specs/ts_123503v171100p.pdf", "spec_number": "23.503", "release": "Rel-17", "version": "17.11.0"},
]


def main() -> None:
    db = SessionLocal()
    try:
        for spec in SPECS:
            path = Path(spec["path"])
            if is_completed(spec["spec_number"]):
                print(f"Skipping {path} — manifest already marks {spec['spec_number']} completed")
                continue
            print(f"Ingesting {path} ...")
            result = ingest_pdf(
                db,
                path,
                spec_number=spec["spec_number"],
                release=spec["release"],
                version=spec["version"],
            )
            print(
                f"  -> document_id={result.document_id} skipped={result.skipped} "
                f"chunks={result.chunk_count} quality_issues={result.quality_issue_count}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
