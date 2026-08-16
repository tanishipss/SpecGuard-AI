import json
from pathlib import Path

MANIFEST_PATH = Path("data/documents_manifest.json")

# Coarse per-document progress, checked before each ingest run so a crash
# doesn't force redoing already-finished documents. Deliberately document-
# level (not chunk-level): once Docling was replaced with PyMuPDF (see
# parser.py), a full document's parse+chunk+embed dropped from hours to
# minutes, so document-level idempotency is enough — the DB's document_hash
# skip-check already gives correctness; this manifest adds fast, no-DB-query
# visibility into what's done without needing to query Postgres.
STATUSES = ("pending", "parsing", "parsed", "chunking", "chunked", "embedding", "completed", "failed")


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(data: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


def update_status(spec_number: str, status: str, **extra) -> None:
    if status not in STATUSES:
        raise ValueError(f"unknown manifest status: {status}")
    data = load_manifest()
    entry = data.get(spec_number, {})
    entry["status"] = status
    entry.update(extra)
    data[spec_number] = entry
    save_manifest(data)


def is_completed(spec_number: str) -> bool:
    return load_manifest().get(spec_number, {}).get("status") == "completed"
