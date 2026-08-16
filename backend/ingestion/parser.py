import hashlib
import logging
import re
from pathlib import Path

from backend.ingestion.schemas import ParsedDocument, ParsedSection

logger = logging.getLogger(__name__)

# 3GPP clause numbers look like "5.2.2.2.1 Registration management" — but
# PyMuPDF's "text" mode extracts the clause number and its title as two
# separate lines (they're two columns in the PDF's heading style), so the
# primary pattern is number-alone-on-a-line + title-alone-on-the-next-line.
# CLAUSE_HEADING_RE below is a fallback for the rarer case they land on one
# line. Headings don't end with a period — that's what keeps this from
# matching numbered list items or table rows that start with a number.
NUMBER_ONLY_RE = re.compile(r"^(\d+(?:\.\d+){0,5})$")
TITLE_LINE_RE = re.compile(r"^[A-Z][^\n.]{1,150}$")
CLAUSE_HEADING_RE = re.compile(r"^(\d+(?:\.\d+){0,5})\s+([A-Z][^\n.]{2,120})$")

# Table-of-contents rows repeat every heading with a dot-leader + page number
# ("6.1.4.1 \nGeneral .......................... 81") — real body headings
# never end this way, so this is what tells a TOC row apart from the real
# section later in the document.
TOC_LEADER_RE = re.compile(r"\.{3,}\s*\d+\s*$")

# Every page repeats a 4-line ETSI/3GPP boilerplate header (org name, doc
# stamp, page number, spec/release line) that would otherwise pollute
# section content and confuse heading detection (the bare page-number line
# looks exactly like a top-level clause number).
_RELEASE_FOOTER_RE = re.compile(r"^3GPP TS .*Release\s*\d+$")

# Docling's layout-detection model was empirically ~2 CPU-minutes/page on this
# (CPU-only) machine even with OCR and table-structure detection both
# disabled — the bottleneck is the layout model itself, not either of those
# stages. Diagnostic evidence: 20 pages of TS 23.501 exceeded 5 minutes with
# do_ocr=False, do_table_structure=False. PyMuPDF extracts full-document text
# in low single-digit seconds. Given the 3GPP corpus size, Docling isn't
# viable here; PyMuPDF + regex-based clause detection is the primary (only)
# parser. Tradeoff: table cell structure is lost — a table's numbers/values
# stay in the surrounding section's text (nothing is discarded), just not
# gridded into rows/columns. See docs/adr/ for the full writeup.
TABLE_CAPTION_RE = re.compile(r"^Table\s+\d+(?:\.\d+)*", re.IGNORECASE)
_NUMERIC_TOKEN_RE = re.compile(r"^-?\d+(\.\d+)?%?$")


def compute_document_hash(path: Path) -> str:
    sha256 = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            sha256.update(block)
    return sha256.hexdigest()


def _parent_clause(section: str) -> str | None:
    parts = section.split(".")
    return ".".join(parts[:-1]) if len(parts) > 1 else None


def looks_tabular(text: str) -> bool:
    """Heuristic only, used for logging visibility (TRD known-gaps note) —
    not persisted. A line counts as "table-row-shaped" if most of its
    whitespace-separated tokens are short numbers/percentages, which is what
    a flattened table row looks like once PyMuPDF strips its grid.
    """
    if TABLE_CAPTION_RE.search(text):
        return True
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        return False
    tabular_lines = 0
    for line in lines:
        tokens = line.split()
        if not tokens:
            continue
        numeric = sum(1 for t in tokens if _NUMERIC_TOKEN_RE.match(t))
        if numeric >= max(2, len(tokens) // 2):
            tabular_lines += 1
    return tabular_lines / len(lines) >= 0.2


def parse_pdf(
    path: Path,
    *,
    spec_number: str,
    release: str,
    version: str,
    title: str | None = None,
) -> ParsedDocument:
    """Parse a 3GPP spec PDF into heading-bounded sections using PyMuPDF +
    regex-based clause detection (see module docstring for why Docling isn't
    used here). Preserves page numbers and clause hierarchy; loses table grid
    structure (values are kept as flat text, not dropped).
    """
    document_hash = compute_document_hash(path)
    sections, doc_title, heading_index = _parse_with_pymupdf(path)

    return ParsedDocument(
        spec_number=spec_number,
        title=title or doc_title or path.stem,
        release=release,
        version=version,
        source_file=str(path),
        document_hash=document_hash,
        sections=sections,
        heading_index=heading_index,
        parser_used="pymupdf",
    )


def _stripped_lines(doc) -> list[tuple[int, str]]:
    """Flatten the document into (page_no, line) pairs with the repeating
    ETSI/3GPP per-page boilerplate header removed (see module docstring).
    """
    lines: list[tuple[int, str]] = []
    skip_until_release_line = False

    for page_index in range(len(doc)):
        page_no = page_index + 1
        for raw_line in doc[page_index].get_text("text").splitlines():
            line = raw_line.strip()
            if not line:
                continue

            if line == "ETSI":
                skip_until_release_line = True
                continue
            if skip_until_release_line:
                if _RELEASE_FOOTER_RE.match(line):
                    skip_until_release_line = False
                continue

            lines.append((page_no, line))

    return lines


def _parse_with_pymupdf(path: Path) -> tuple[list[ParsedSection], str | None, dict[str, str]]:
    import fitz  # PyMuPDF

    doc = fitz.open(str(path))
    doc_title = (doc.metadata or {}).get("title") or None
    lines = _stripped_lines(doc)
    doc.close()

    sections: list[ParsedSection] = []
    heading_index: dict[str, str] = {}

    current_section = "0"
    current_title = doc_title or path.stem
    current_level = 0
    buffer: list[str] = []
    page_start = lines[0][0] if lines else 1
    page_end = page_start
    heading_index[current_section] = current_title

    def flush(end_page: int) -> None:
        text = "\n\n".join(chunk for chunk in buffer if chunk.strip())
        if text.strip():
            sections.append(
                ParsedSection(
                    section=current_section,
                    subsection=_parent_clause(current_section),
                    section_title=current_title,
                    content=text,
                    page_start=page_start,
                    page_end=max(page_start, end_page),
                    level=current_level,
                )
            )
        buffer.clear()

    def start_heading(number: str, title: str, page_no: int) -> None:
        nonlocal current_section, current_title, current_level, page_start
        flush(page_no)
        current_section, current_title = number, title.strip()
        current_level = current_section.count(".") + 1
        heading_index[current_section] = current_title
        page_start = page_no

    i = 0
    n = len(lines)
    while i < n:
        page_no, line = lines[i]

        number_only = NUMBER_ONLY_RE.match(line)
        if number_only:
            next_line = lines[i + 1][1] if i + 1 < n else None
            if next_line and TOC_LEADER_RE.search(next_line):
                # Table-of-contents row (number + dot-leader title) — not a
                # real heading, and not useful body content either.
                i += 2
                continue
            if next_line and TITLE_LINE_RE.match(next_line):
                start_heading(number_only.group(1), next_line, page_no)
                i += 2
                page_end = page_no
                continue
            buffer.append(line)
            page_end = page_no
            i += 1
            continue

        inline_match = CLAUSE_HEADING_RE.match(line)
        if inline_match and not TOC_LEADER_RE.search(line):
            start_heading(inline_match.group(1), inline_match.group(2), page_no)
            i += 1
            page_end = page_no
            continue

        buffer.append(line)
        page_end = page_no
        i += 1

    flush(page_end)
    return sections, doc_title, heading_index
