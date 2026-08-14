# ADR-7: PostgreSQL + pgvector over a dedicated vector database

## Status
Accepted

## Context
The corpus for this project is a handful of 3GPP specs (tens of thousands of chunks at most), not a web-scale index. A dedicated vector database (Pinecone, Weaviate, Qdrant, ...) adds a second system to run, secure, and keep consistent with the relational metadata (documents, releases, sections) that every query also needs.

## Decision
Use a single PostgreSQL instance with the `pgvector` extension (HNSW index) for embeddings, alongside native full-text search (GIN-indexed `tsvector`) for the sparse retrieval path (ADR-2) and ordinary relational tables for `documents`/`chunks`/`queries` metadata.

## Consequences
One database to operate, back up, and migrate (via Alembic), and joins between vector search results and relational metadata (spec_number, release, section) are ordinary SQL rather than a cross-system lookup. This would need revisiting if the corpus grew to a scale where pgvector's HNSW recall/latency stopped being competitive with a purpose-built vector index — not the case at this corpus size.
