import hashlib
import logging
import re
from pathlib import Path

from backend.ingestion.schemas import ParsedDocument, ParsedSection

logger = logging.getLogger(__name__)

# 3GPP clause numbers look like "5.2.2.2.1 Registration management".
CLAUSE_HEADING_RE = re.compile(r"^(\d+(?:\.\d+){0,5})\s+(.+?)\s*$")


def compute_document_hash(path: Path) -> str:
    sha256 = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            sha256.update(block)
    return sha256.hexdigest()


def _parent_clause(section: str) -> str | None:
    parts = section.split(".")
    return ".".join(parts[:-1]) if len(parts) > 1 else None


def parse_pdf(
    path: Path,
    *,
    spec_number: str,
    release: str,
    version: str,
    title: str | None = None,
) -> ParsedDocument:
    """Parse a 3GPP spec PDF into heading-bounded sections.

    Tries Docling first (preserves clause hierarchy, tables, page order).
    Falls back to a flat PyMuPDF text dump — with a single synthetic
    section — if Docling fails to convert the file, so ingestion never
    hard-fails on a single malformed PDF.
    """
    document_hash = compute_document_hash(path)
    try:
        sections, doc_title, heading_index = _parse_with_docling(path)
        parser_used = "docling"
    except Exception:
        logger.exception("Docling conversion failed for %s, falling back to PyMuPDF", path)
        sections, doc_title = _parse_with_pymupdf_fallback(path)
        heading_index = {s.section: s.section_title for s in sections}
        parser_used = "pymupdf_fallback"

    return ParsedDocument(
        spec_number=spec_number,
        title=title or doc_title or path.stem,
        release=release,
        version=version,
        source_file=str(path),
        document_hash=document_hash,
        sections=sections,
        heading_index=heading_index,
        parser_used=parser_used,
    )


def _parse_with_docling(path: Path) -> tuple[list[ParsedSection], str | None, dict[str, str]]:
    from docling.document_converter import DocumentConverter

    result = DocumentConverter().convert(str(path))
    doc = result.document
    doc_title = getattr(doc, "name", None) or getattr(doc, "title", None)

    sections: list[ParsedSection] = []
    heading_index: dict[str, str] = {}

    current_section = "0"
    current_title = doc_title or path.stem
    current_level = 0
    buffer: list[str] = []
    page_start: int | None = None
    page_end: int | None = None
    heading_index[current_section] = current_title

    def flush() -> None:
        text = "\n\n".join(chunk for chunk in buffer if chunk.strip())
        if text.strip():
            sections.append(
                ParsedSection(
                    section=current_section,
                    subsection=_parent_clause(current_section),
                    section_title=current_title,
                    content=text,
                    page_start=page_start or 1,
                    page_end=page_end or page_start or 1,
                    level=current_level,
                )
            )
        buffer.clear()

    for item, level in doc.iterate_items():
        label = getattr(item, "label", "")
        text = getattr(item, "text", "") or ""
        page_no = None
        prov = getattr(item, "prov", None)
        if prov:
            page_no = getattr(prov[0], "page_no", None)

        is_heading = label in ("section_header", "title") or str(label).endswith("header")

        if is_heading and text.strip():
            match = CLAUSE_HEADING_RE.match(text.strip())
            flush()
            if match:
                current_section, current_title = match.group(1), match.group(2)
            else:
                current_section, current_title = current_section, text.strip()
            heading_index[current_section] = current_title
            current_level = level
            page_start = page_no
            page_end = page_no
            continue

        if not text.strip():
            continue

        if label == "table":
            buffer.append(f"[TABLE]\n{text.strip()}")
        else:
            buffer.append(text.strip())

        if page_no is not None:
            page_start = page_start or page_no
            page_end = page_no

    flush()
    return sections, doc_title, heading_index


def _parse_with_pymupdf_fallback(path: Path) -> tuple[list[ParsedSection], str | None]:
    import fitz  # PyMuPDF

    doc = fitz.open(str(path))
    doc_title = (doc.metadata or {}).get("title") or None

    pages_text: list[str] = []
    for page in doc:
        pages_text.append(page.get_text("text"))
    doc.close()

    full_text = "\n\n".join(pages_text)
    section = ParsedSection(
        section="0",
        subsection=None,
        section_title=doc_title or path.stem,
        content=full_text,
        page_start=1,
        page_end=len(pages_text) or 1,
        level=0,
    )
    return [section], doc_title
