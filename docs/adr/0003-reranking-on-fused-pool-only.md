# ADR-3: Cross-encoder reranking on the fused top-N only, not the full corpus

## Status
Accepted

## Context
A cross-encoder scores each (query, passage) pair jointly, which is far more precise than comparing fixed bi-encoder vectors — but it can't be indexed, so its cost scales linearly with however many candidates it's asked to score.

## Decision
Rerank only the fused top-N (default 20, `fusion_pool_size` in `backend/config.py`) coming out of RRF, not the full retrieved candidate set or the whole corpus.

## Consequences
Reranking latency stays bounded regardless of corpus size. This assumes RRF's top-20 already contains the truly relevant chunks most of the time — if fusion recall is poor, capping the pool before reranking can't recover a relevant chunk that fusion dropped. The pool size is a tunable trade-off between latency and recall headroom.
