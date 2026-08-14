import re

from backend.generation.schemas import CitationValidation

CITATION_RE = re.compile(r"SRC-\d{3}")


def extract_cited_ids(answer: str) -> list[str]:
    seen: list[str] = []
    for match in CITATION_RE.findall(answer):
        if match not in seen:
            seen.append(match)
    return seen


def validate_citations(answer: str, chunks) -> CitationValidation:
    """Deterministic, post-generation check (TRD §7.3): every SRC-ID the
    model cited must resolve to a chunk actually in this request's context,
    and a factual answer must cite at least one source. This makes a
    fabricated citation structurally impossible to slip through — the
    model can hallucinate an ID, but it can never make it validate.
    """
    valid_ids = {c.source_id for c in chunks}
    cited = extract_cited_ids(answer)
    unknown = [cid for cid in cited if cid not in valid_ids]
    has_citation = len(cited) > 0

    if not has_citation:
        return CitationValidation(cited, unknown, has_citation, valid=False, reason="answer cites no SRC-ID")
    if unknown:
        return CitationValidation(
            cited, unknown, has_citation, valid=False, reason=f"answer cites unresolvable ID(s): {unknown}"
        )
    return CitationValidation(cited, unknown, has_citation, valid=True, reason="all citations resolve")
