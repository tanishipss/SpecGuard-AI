from dataclasses import dataclass

from backend.ingestion.schemas import ChunkCandidate

MIN_CONTENT_CHARS = 20
# Chunks are allowed to run over max_tokens by this fraction before being
# flagged — a single long paragraph can legitimately push a chunk past the
# target without being a parsing failure.
OVERSIZE_TOLERANCE = 1.5


@dataclass
class QualityIssue:
    chunk_index: int
    reason: str


def check_chunks(
    chunks: list[ChunkCandidate],
    *,
    max_tokens: int,
) -> list[QualityIssue]:
    issues: list[QualityIssue] = []

    for i, chunk in enumerate(chunks):
        if len(chunk.content.strip()) < MIN_CONTENT_CHARS:
            issues.append(QualityIssue(i, "content too short — likely extraction failure"))

        if chunk.token_count > max_tokens * OVERSIZE_TOLERANCE:
            issues.append(
                QualityIssue(i, f"chunk is {chunk.token_count} tokens, > {OVERSIZE_TOLERANCE}x max_tokens")
            )

        if chunk.page_start > chunk.page_end:
            issues.append(QualityIssue(i, "page_start > page_end"))

        if not chunk.section_title.strip():
            issues.append(QualityIssue(i, "missing section title"))

    return issues
