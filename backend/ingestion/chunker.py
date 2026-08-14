from backend.ingestion.schemas import ChunkCandidate, ParsedDocument, ParsedSection
from backend.ingestion.tokens import count_tokens


def _parent_title(section: ParsedSection, heading_index: dict[str, str]) -> str:
    if section.subsection and section.subsection in heading_index:
        return heading_index[section.subsection]
    return section.section_title


def _build_parent_context(section: ParsedSection, heading_index: dict[str, str]) -> str:
    parent_title = _parent_title(section, heading_index)
    path = f"{section.section} {section.section_title}"
    if section.subsection:
        path = f"{section.subsection} {parent_title} > {path}"
    return path


def _split_paragraphs(content: str) -> list[str]:
    return [p.strip() for p in content.split("\n\n") if p.strip()]


def _pack_paragraphs(
    paragraphs: list[str],
    max_tokens: int,
    overlap_tokens: int,
) -> list[str]:
    """Greedily pack paragraphs into pieces <= max_tokens, never splitting a
    paragraph itself, carrying the tail `overlap_tokens` of each piece into
    the next as an overlap seed.
    """
    pieces: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for paragraph in paragraphs:
        p_tokens = count_tokens(paragraph)

        if current and current_tokens + p_tokens > max_tokens:
            pieces.append("\n\n".join(current))
            current = _overlap_seed(current, overlap_tokens)
            current_tokens = sum(count_tokens(p) for p in current)

        current.append(paragraph)
        current_tokens += p_tokens

    if current:
        pieces.append("\n\n".join(current))

    return pieces


def _overlap_seed(paragraphs: list[str], overlap_tokens: int) -> list[str]:
    """Return the trailing paragraphs of `paragraphs` whose combined token
    count fits within overlap_tokens, to seed the next piece for continuity.

    A paragraph that alone exceeds the overlap budget is left out rather
    than force-included — otherwise a single oversized paragraph would
    balloon every subsequent piece past max_tokens.
    """
    if overlap_tokens <= 0:
        return []
    seed: list[str] = []
    total = 0
    for paragraph in reversed(paragraphs):
        p_tokens = count_tokens(paragraph)
        if total + p_tokens > overlap_tokens:
            break
        seed.insert(0, paragraph)
        total += p_tokens
        if total >= overlap_tokens:
            break
    return seed


def chunk_document(
    document: ParsedDocument,
    document_id: str,
    *,
    min_tokens: int = 500,
    max_tokens: int = 900,
    overlap_tokens: int = 75,
) -> list[ChunkCandidate]:
    """Structure-aware parent-child chunking per TRD §3.

    Each ParsedSection is chunked independently — sections are never merged
    across headings, specs, or releases. A section within bounds becomes one
    chunk; an oversized section is split along paragraph boundaries with a
    token-based overlap seed, never by raw character count.
    """
    chunks: list[ChunkCandidate] = []

    for section in document.sections:
        parent_context = _build_parent_context(section, document.heading_index)
        section_tokens = count_tokens(section.content)

        if section_tokens <= max_tokens:
            chunks.append(
                ChunkCandidate(
                    document_id=document_id,
                    section=section.section,
                    subsection=section.subsection,
                    section_title=section.section_title,
                    content=section.content,
                    page_start=section.page_start,
                    page_end=section.page_end,
                    parent_context=parent_context,
                    token_count=section_tokens,
                )
            )
            continue

        paragraphs = _split_paragraphs(section.content)
        pieces = _pack_paragraphs(paragraphs, max_tokens, overlap_tokens)
        for piece in pieces:
            chunks.append(
                ChunkCandidate(
                    document_id=document_id,
                    section=section.section,
                    subsection=section.subsection,
                    section_title=section.section_title,
                    content=piece,
                    page_start=section.page_start,
                    page_end=section.page_end,
                    parent_context=parent_context,
                    token_count=count_tokens(piece),
                )
            )

    return chunks
