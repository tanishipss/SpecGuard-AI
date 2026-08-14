import re

from backend.config import settings
from backend.retrieval.schemas import EvidenceDecision, EvidenceSignals, RetrievedChunk

DEFINITIONAL_RE = re.compile(r"^\s*(what is|what are|define|what does|meaning of)\b", re.IGNORECASE)

# A token counts as a technical identifier if it contains a digit ("5QI",
# "N2", "S1-MME") or is a short all-caps acronym ("AMF", "SMF") — either
# shape is unlikely to appear in a chunk by coincidence.
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*")


def classify_query_type(query: str) -> str:
    if DEFINITIONAL_RE.match(query):
        return "definitional"
    return "procedural"


def extract_identifiers(query: str) -> list[str]:
    tokens = _TOKEN_RE.findall(query)
    return [t for t in tokens if any(c.isdigit() for c in t) or (t.isupper() and len(t) >= 2)]


def compute_signals(query: str, ranked_chunks: list[RetrievedChunk]) -> EvidenceSignals:
    query_type = classify_query_type(query)

    if not ranked_chunks:
        return EvidenceSignals(
            top_rerank_score=float("-inf"),
            score_margin=0.0,
            supporting_chunk_count=0,
            identifier_match=False,
            query_type=query_type,
        )

    top_score = ranked_chunks[0].rerank_score or float("-inf")
    if len(ranked_chunks) >= 2:
        second_score = ranked_chunks[1].rerank_score or float("-inf")
        margin = top_score - second_score
    else:
        # No competing candidate to be confused with — margin isn't a
        # meaningful risk signal here, so don't let it veto sufficiency.
        margin = float("inf")

    supporting_chunk_count = sum(
        1 for c in ranked_chunks if (c.rerank_score or float("-inf")) >= settings.evidence_min_rerank_score
    )

    identifiers = extract_identifiers(query)
    identifier_match = bool(identifiers) and any(ident in ranked_chunks[0].content for ident in identifiers)

    return EvidenceSignals(
        top_rerank_score=top_score,
        score_margin=margin,
        supporting_chunk_count=supporting_chunk_count,
        identifier_match=identifier_match,
        query_type=query_type,
    )


def decide(signals: EvidenceSignals) -> EvidenceDecision:
    """Combine evidence signals into a refuse/answer decision.

    Thresholds are placeholders (see config.py) pending empirical
    calibration against the eval set (TRD §7.1 / ADR-4) — this function is
    the single place that logic will need retuning once that data exists.
    """
    threshold = settings.evidence_min_rerank_score
    if signals.query_type == "definitional":
        threshold += settings.evidence_definitional_score_bonus

    reasons = []
    if signals.top_rerank_score < threshold:
        reasons.append(f"top rerank score {signals.top_rerank_score:.2f} < threshold {threshold:.2f}")
    if signals.score_margin < settings.evidence_min_margin:
        reasons.append(f"score margin {signals.score_margin:.2f} < {settings.evidence_min_margin}")
    if signals.supporting_chunk_count < settings.evidence_min_supporting_chunks:
        reasons.append(
            f"only {signals.supporting_chunk_count} supporting chunk(s), "
            f"need {settings.evidence_min_supporting_chunks}"
        )

    sufficient = not reasons

    # A literal identifier match is strong enough evidence to rescue a
    # borderline case that only failed on margin/agreement, but never one
    # that failed the score floor outright.
    if not sufficient and signals.identifier_match and signals.top_rerank_score >= threshold:
        sufficient = True
        reasons = []

    reason = "evidence sufficient" if sufficient else "; ".join(reasons)
    return EvidenceDecision(sufficient=sufficient, signals=signals, reason=reason)
