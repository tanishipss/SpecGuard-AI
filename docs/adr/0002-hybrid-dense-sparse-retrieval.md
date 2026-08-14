# ADR-2: Hybrid dense + sparse retrieval over pure vector search

## Status
Accepted

## Context
Embeddings retrieve by semantic similarity but are unreliable for exact technical identifiers ("N2 interface", "5QI", "S1-MME") — a query naming a specific identifier can retrieve semantically-similar-but-wrong chunks over the one chunk that literally names it.

## Decision
Run dense (pgvector/HNSW) and sparse (Postgres full-text search) retrieval in parallel and fuse the two ranked lists with Reciprocal Rank Fusion (§2).

## Consequences
Exact identifier matches are no longer solely dependent on embedding quality. This adds a second retrieval path (and its own top-k/index) to maintain, but no second infrastructure component — full-text search is native to the same Postgres instance already used for vectors (ADR-7).
