# ADR-4: Evidence gate pre-generation, calibrated on eval data, using multiple signals

## Status
Accepted — thresholds not yet calibrated (see Consequences)

## Context
Deciding whether to even attempt an answer needs to happen before generation, not after — an ungrounded generation that gets refused post-hoc still cost an LLM call and risked leaking unsupported claims through a validation gap. A single similarity number (e.g. "top cosine score > 0.7") is not robust: it doesn't distinguish "one great match" from "several mediocre matches that corroborate each other," and a fixed threshold behaves differently for a narrow definitional question than a broad procedural one.

## Decision
Gate before generation (`backend/retrieval/evidence_gate.py`), combining: top reranker score, score margin between top-1 and top-2, count of independent supporting chunks, literal identifier match, and a query-type-aware threshold (stricter for definitional questions).

## Consequences
Refusing early is cheaper than refusing after a wasted generation call, and combining signals is more robust than any single one. The cost: this only works once the thresholds in `backend/config.py` are calibrated against real evaluation data (§10) — they currently ship as explicitly-labeled placeholders, and treating them as tuned before that calibration happens would be the exact "guess a number before you have data" mistake this ADR exists to avoid.
