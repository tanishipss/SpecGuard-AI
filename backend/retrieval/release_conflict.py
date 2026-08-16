from collections import defaultdict

from backend.retrieval.schemas import ReleaseConflict, RetrievedChunk


def detect_release_conflict(chunks: list[RetrievedChunk]) -> ReleaseConflict:
    """Deterministic, code-level check (TRD §8) for whether the final
    reranked chunk set — the same chunks generation will see — spans more
    than one `release` for the same `spec_number`.

    Different specs at different releases is normal and not a conflict
    (e.g. 23.501 Rel-17 alongside 23.502 Rel-17); the same spec appearing
    at two releases is. This only fires when `release` was left
    unspecified on the request — dense/sparse search already hard-filter
    to a single release when one is given (backend/retrieval/dense.py), so
    a specified release makes a conflict structurally impossible.
    """
    releases_by_spec: dict[str, set[str]] = defaultdict(set)
    for chunk in chunks:
        releases_by_spec[chunk.spec_number].add(chunk.release)

    conflicting = {spec: releases for spec, releases in releases_by_spec.items() if len(releases) > 1}
    return ReleaseConflict(detected=bool(conflicting), conflicting_specs=conflicting)
