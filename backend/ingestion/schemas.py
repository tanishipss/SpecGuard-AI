from dataclasses import dataclass, field


@dataclass
class ParsedSection:
    """One contiguous block of body text under a single heading.

    `section` is the clause number (e.g. "5.2.2.2.1"); `subsection` is the
    immediate parent clause one level up (e.g. "5.2.2.2"), used to build
    `parent_context` for chunks. Page numbers are 1-indexed and inclusive.
    """

    section: str
    subsection: str | None
    section_title: str
    content: str
    page_start: int
    page_end: int
    level: int


@dataclass
class ParsedDocument:
    spec_number: str
    title: str
    release: str
    version: str
    source_file: str
    document_hash: str
    sections: list[ParsedSection] = field(default_factory=list)
    heading_index: dict[str, str] = field(default_factory=dict)
    parser_used: str = "docling"


@dataclass
class ChunkCandidate:
    document_id: str
    section: str
    subsection: str | None
    section_title: str
    content: str
    page_start: int
    page_end: int
    parent_context: str | None
    token_count: int
