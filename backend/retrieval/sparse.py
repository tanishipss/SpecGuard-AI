import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Chunk, Document
from backend.retrieval.schemas import RetrievedChunk, from_chunk_row

_WORD_RE = re.compile(r"[A-Za-z0-9']+")

# Same shape as evidence_gate.extract_identifiers: a token counts as a
# technical identifier if it has a digit ("5QI", "N2") or is a short
# all-caps acronym ("AMF", "SMF"). Prioritizing these keeps sparse search
# doing its actual job (TRD §1: "catches exact technical identifiers that
# embeddings can miss") instead of drowning in generic domain words like
# "session"/"PDU" that appear in most of the corpus.
def _identifiers(words: list[str]) -> list[str]:
    return [w for w in words if any(ch.isdigit() for ch in w) or (w.isupper() and len(w) >= 2)]


def _or_tsquery_text(query_text: str) -> str:
    """plainto_tsquery ANDs every term together — fine for a couple of
    keywords, but a full natural-language question ("What does the acronym
    SMF stand for...") almost never has a single chunk containing all of
    "does", "acronym", "stand", "role", AND "smf", so it silently returns
    zero rows. OR the terms instead — this is a recall channel, not a
    boolean-exact-match query.

    When the query contains identifier-like tokens (acronyms, codes), OR
    only those: ORing in every generic word ("session", "PDU" appear in
    most of this corpus) dilutes ts_rank_cd enough that the one chunk that
    actually matters can rank behind dozens of tangentially-related ones.
    """
    words = _WORD_RE.findall(query_text)
    identifiers = _identifiers(words)
    terms = identifiers or words
    return " | ".join(terms) if terms else query_text


def sparse_search(
    db: Session,
    query_text: str,
    top_k: int,
    *,
    release: str | None = None,
) -> list[RetrievedChunk]:
    """Lexical search over chunk content via Postgres full-text search
    (tsvector + GIN), ranked by ts_rank_cd. Catches exact technical
    identifiers ("N2 interface", "5QI") that dense embeddings can miss.
    """
    tsquery = func.to_tsquery("english", _or_tsquery_text(query_text))
    rank = func.ts_rank_cd(Chunk.tsv, tsquery).label("rank")

    stmt = (
        select(Chunk, Document.spec_number, Document.release, rank)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.tsv.op("@@")(tsquery))
    )
    if release:
        stmt = stmt.where(Document.release == release)
    stmt = stmt.order_by(rank.desc()).limit(top_k)

    results: list[RetrievedChunk] = []
    for sparse_rank, (chunk, spec_number, doc_release, _rank) in enumerate(db.execute(stmt).all(), start=1):
        results.append(from_chunk_row(chunk, spec_number, doc_release, sparse_rank=sparse_rank))
    return results
