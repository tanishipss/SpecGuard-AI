# SpecGuard AI

**Evidence-grounded AI for 3GPP standards.** Ask a question about the 5G System Architecture specifications and get back an answer that traces to a real clause, section, and page — with every retrieval, reranking, and validation step that produced it fully inspectable.

SpecGuard AI is a retrieval-augmented generation (RAG) assistant built around a **guardrail pipeline** that makes fabricated citations structurally impossible and refuses to answer rather than hallucinate when the evidence is thin. It currently indexes three 3GPP Release 17 specifications:

| Spec | Title |
|---|---|
| **TS 23.501** | System Architecture for the 5G System (5GS) |
| **TS 23.502** | Procedures for the 5G System |
| **TS 23.503** | Policy and Charging Control Framework for the 5G System |

Full design rationale lives in [`docs/TRD.md`](docs/TRD.md) (Technical Requirements Document) and [`docs/adr/`](docs/adr/) (Architecture Decision Records). This README is the practical companion: what the product is, why it's built the way it is, how the pieces fit together, and how to run it yourself.

<p align="center">
  <img src="Screenshots/01-landing.png" width="850" alt="SpecGuard AI landing page">
</p>

---

## Table of contents

- [Why it exists](#why-it-exists)
- [Key capabilities](#key-capabilities)
- [Architecture](#architecture)
- [The guardrail pipeline, in depth](#the-guardrail-pipeline-in-depth)
- [Chunking strategy](#chunking-strategy)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Running tests](#running-tests)
- [Running the evaluation harness](#running-the-evaluation-harness)
- [Repository structure](#repository-structure)
- [Non-functional design notes](#non-functional-design-notes)
- [Architecture decision records](#architecture-decision-records)
- [Known limitations](#known-limitations)

---

## Why it exists

Generic RAG chatbots have a trust problem: they'll answer confidently even when the retrieved context doesn't actually support the claim, and there's usually no way for the person reading the answer to check. For a domain like telecom standards — where an engineer might act on an incorrect claim about clause 5.2.2.2.1 of a 3GPP spec — that's a real liability, not a demo inconvenience.

Most RAG demos treat this as a prompting problem: tell the model to "only use the provided context" and hope. SpecGuard AI's answer is architectural instead of aspirational:

- Every factual claim is required to cite a source ID (`SRC-001`, `SRC-002`, …) that the **backend**, not the model, resolves back to a real retrieved chunk. An invented citation has nothing to resolve to, so it can't survive.
- A second, independent model call — the **grounding validator** — checks whether the generated answer is actually entailed by the chunks it cited, *after* generation, before the answer is ever returned to the user.
- If the system doesn't have enough evidence to answer confidently, it says so and refuses, rather than filling the gap with plausible-sounding text.

The goal is that "how do you know it's not hallucinating?" has a structural answer, not just a prompt-engineering one.

## Key capabilities

- **Hybrid retrieval** — dense (embedding similarity via `pgvector`) and sparse (PostgreSQL full-text search) retrieval run in parallel and are combined with Reciprocal Rank Fusion, so exact technical identifiers (`5QI`, `N2 interface`, `AMF`) aren't lost to a purely semantic search that only "gets the gist."
- **Cross-encoder reranking** — the fused top-20 candidates are rescored by a cross-encoder that jointly evaluates the (query, passage) pair — meaningfully more precise than ranking by embedding similarity alone, at the cost of only reranking a bounded candidate set rather than the whole corpus.
- **Evidence gate** — before generation even starts, the system decides whether it actually has sufficient evidence to answer, using multiple signals (top score, score margin, cross-source agreement, exact identifier matches) rather than a single similarity threshold. Insufficient evidence → refusal, not a guess.
- **Source-ID citation mapping** — the model is only allowed to cite `SRC-*` labels; it never writes out a spec/section/page itself. The backend resolves each ID from the actual chunks used for that request.
- **Citation validation** — deterministic, post-generation: every cited SRC-ID must exist in the resolved context map, and at least one citation is required for any factual answer. No hand-wavy IDs get through.
- **Independent grounding validator** — a second, separately-prompted model call fact-checks the answer claim-by-claim against the retrieved context, because a generator is a poor judge of its own hallucinations.
- **Release-aware retrieval** — every chunk carries its release (e.g. `Rel-17`) as first-class metadata; conflicting statements across releases are surfaced explicitly rather than silently merged.
- **Prompt-injection defense** — retrieved document text is treated as *data*, never as instructions, even if it contains text that reads like a command.
- **Evidence Explorer** — every answer's retrieved sources are inspectable in the UI: spec number, section, page, and the exact excerpt the model was given, with a visible "Grounded" / verification indicator.
- **A real evaluation harness** — Recall@5, Precision@5, MRR, Citation Correctness, Refusal Accuracy, and Hallucination Rate, computed from actual runs against the actual pipeline — not hardcoded numbers.
- **Full product surface** — authentication, a workspace dashboard, an Ask AI console, a browsable/searchable knowledge base with a full document reader, and an evaluation dashboard. See [Screenshots](#screenshots).

## Architecture

Modular monolith — `backend/{ingestion,retrieval,generation,evaluation,api}` as separate internal modules behind one FastAPI service, plus a React/TypeScript frontend. This was a deliberate choice (see [ADR-7](#architecture-decision-records)): clean module boundaries without the operational overhead of microservices at this scale. Full diagram and rationale in `docs/TRD.md` §2.

```
        3GPP PDFs (TS 23.501, 23.502, 23.503 — Rel-17)
                         │
                         ▼
              Checksum → Docling conversion
     (preserves headings, tables, page boundaries, reading order)
                         │
                         ▼
        Section/page extraction + metadata normalization
                         │
                         ▼
     Structure-aware, parent-child chunking (500–900 tokens)
   chunk = {doc_id, release, section, subsection, page, hash}
                         │
                         ▼
                   Quality checks
                         │
                         ▼
          Embedding generation (BAAI/bge-large-en-v1.5)
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
  pgvector dense search        PostgreSQL full-text search
   (HNSW index, top 20)          (tsvector + GIN, top 20)
           └─────────────┬─────────────┘
                         ▼
          Reciprocal Rank Fusion (top 20–30)
                         ▼
        Cross-encoder reranking (top 20 → top 5–8)
                         ▼
           Assign source IDs (SRC-001, SRC-002, …)
                         ▼
                Evidence Gate (calibrated)
        ┌────────────────┴────────────────┐
    Sufficient                       Insufficient
        ▼                                 ▼
  Gemini generation                  Refusal response
  (context-only prompt,
   cite SRC-IDs only,
   retrieved docs = data,
   never instructions)
        ▼
  Citation validation (do the cited SRC-IDs exist? ≥1 citation?)
        ▼
  Grounding validator (independent model call — claim-by-claim
                        entailment check against the context)
        ┌───────────┴───────────┐
      Pass                     Fail
        ▼                         ▼
Answer + resolved citations   Refuse / flag partial
(SRC-ID → spec/section/page)
```

## The guardrail pipeline, in depth

This is the part of the system that exists specifically to answer "how do you actually know this isn't making things up." Five layers, each independently able to stop a bad answer from reaching the user:

1. **Evidence gate (pre-generation).** Combines several signals rather than trusting one similarity number: the top reranker score, the score margin between the top-1 and top-2 candidates, how many independent chunks agree, whether an exact identifier the question names (e.g. "AMF") is literally present, and the question type (a narrow definitional question can use a stricter bar than an open procedural one). The threshold is meant to be calibrated empirically against evaluation data, not guessed — see [Known limitations](#known-limitations) for where that calibration currently stands.
2. **Context-only constrained prompting.** The generation prompt explicitly forbids outside knowledge, forbids filling gaps with "plausible-sounding" detail, requires a citation for every factual claim, mandates an exact refusal phrase when context is insufficient, and instructs the model to treat retrieved chunks as reference data — never as instructions — which is the system's defense against prompt injection hidden inside document text.
3. **Citation validation (post-generation, deterministic).** Parses every SRC-ID the model cited, checks each one exists in the resolved context map for that request, rejects unknown IDs, and requires at least one citation for a factual answer. No model call involved — this is a plain lookup, which is exactly why it's reliable.
4. **Grounding validator (post-generation, independent model call).** A second, separately-prompted model reads the generated answer and the resolved context and judges, sentence by sentence, whether each factual claim is actually supported — returning a structured pass/fail verdict plus a list of any unsupported claims. This is the layer most RAG demos skip, and deliberately the one this project keeps: a model checking its own work is a much weaker signal than an independent, narrowly-scoped second opinion.
5. **Refusal policy.** The system refuses when evidence is below threshold, citation validation fails, grounding validation fails, or sources conflict without resolution — surfacing a clear, honest "insufficient evidence" message rather than a partial or misleading answer.

## Chunking strategy

Chunk quality is upstream of everything else in the pipeline — a badly-split chunk can't be retrieved well or cited accurately no matter how good the reranker is. Rules (TRD §3):

1. Never split a section heading from its content.
2. Preserve the full section path (parent → subsection).
3. Split oversized sections by paragraph, never by raw character count.
4. Add overlap (50–100 tokens) only when a section must be split.
5. Never mix different specification documents in one chunk.
6. Never mix releases in one chunk.
7. Target 500–900 tokens per chunk.

**Parent-child retrieval:** the specific child chunk is retrieved for relevance, but its parent section title (and optionally an adjacent sibling chunk) is passed to the LLM as extra context — this reduces cases where a technically-correct chunk reads as ambiguous when shown in isolation.

## Data model

**`documents`** — one row per ingested spec: `id`, `spec_number`, `title`, `release`, `version`, `source_file`, `document_hash` (SHA-256, for change detection), `ingested_at`.

**`chunks`** — one row per chunk: `id`, `document_id`, `section`, `subsection`, `section_title`, `page_start`/`page_end`, `content`, `parent_context`, `tsv` (generated tsvector), `embedding` (`vector(1024)`), `embedding_model_version`, `token_count`. Indexed with HNSW on `embedding` and GIN on `tsv`.

**`queries`** — an audit log of every chat request: question, retrieved chunk IDs, rerank scores, whether evidence was judged sufficient, the generated answer, citations, grounding verdict, latency, timestamp.

## API reference

All endpoints are under `/api/v1`. Interactive OpenAPI docs are served at `/docs` once the backend is running.

### `POST /api/v1/chat`

**Request**
```json
{ "question": "What is the purpose of the AMF in 5G?", "release": "Rel-17", "top_k": 5 }
```

**Response**
```json
{
  "answer": "According to [SRC-001], the AMF is responsible for registration management, connection management, reachability management, and mobility management.",
  "grounded": true,
  "sources": [
    { "source_id": "SRC-001", "spec_number": "23.501", "release": "Rel-17", "section": "5.2.2.2.1", "page": 45, "snippet": "..." }
  ],
  "retrieval": { "dense_candidates": 20, "sparse_candidates": 20, "reranked_candidates": 20, "final_context": 5 },
  "grounding_verdict": "pass",
  "latency_ms": 1830
}
```

### Other endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/ingest` | Ingest a spec PDF: parse → chunk → quality-check → embed → store |
| `GET /api/v1/documents` | List indexed specifications |
| `GET /api/v1/documents/{document_id}` | Full document detail, including section tree |
| `GET /api/v1/documents/{document_id}/search` | Search within a single specification |
| `GET /api/v1/eval/run` | Run the evaluation harness (`?limit=N` for a smoke run) |
| `POST /api/v1/auth/signup` / `POST /api/v1/auth/login` | Account creation / session issuance (JWT) |
| `GET /api/v1/auth/me` | Current session's user, or 401 if not authenticated |
| `GET /health`, `GET /health/db` | Liveness / database connectivity checks |

**Error codes:** `400` invalid request · `404` unknown resource · `422` validation failure · `429` rate limit · `500` unexpected error · `503` LLM/DB unavailable. The API never returns stack traces to the client.

---

## Screenshots

### Landing page
Public product page — the evidence artifact on the right (retrieved source, grounded answer, verification badge) is a real UI component from the product, not a mockup.

<img src="Screenshots/01-landing.png" width="850" alt="Landing page">

### Sign in / Create account
A shared authentication design system — same card treatment, input sizing, and evidence-preview panel on both pages.

<p>
  <img src="Screenshots/02-login.png" width="415" alt="Login page">
  <img src="Screenshots/03-signup.png" width="415" alt="Signup page">
</p>

### Dashboard
The workspace command center — knowledge health, an Ask SpecGuard AI entry point with real suggested questions per indexed spec, connected specifications, and the retrieval pipeline at a glance.

<img src="Screenshots/04-dashboard.png" width="850" alt="Dashboard">

### Ask AI
An enterprise standards assistant, not a generic chatbot — the empty state sets expectations (grounded, evidence-backed, cited), and a real answer shows inline numbered citations resolved to their source chunks.

<p>
  <img src="Screenshots/05-assistant-empty.png" width="415" alt="Ask AI empty state">
  <img src="Screenshots/06-assistant-answer.png" width="415" alt="Ask AI grounded answer with citations">
</p>

### Knowledge Base
Every indexed specification as a real, inspectable artifact — chunk counts, indexing status, and corpus-wide totals, all computed from live data.

<img src="Screenshots/07-knowledge-base.png" width="850" alt="Knowledge Base">

### Document viewer
A specification reader with a live table of contents, the actual extracted document text, and an AI context panel showing what's indexed and searchable from that document.

<img src="Screenshots/08-document-viewer.png" width="850" alt="Document viewer">

### Evaluation
Retrieval and grounding metrics from a real evaluation run — Recall@5, Precision@5, MRR, Citation Correctness, Hallucination Rate — plus an ablation comparison table that's honestly labeled "not yet run" rather than filled with invented numbers.

<img src="Screenshots/09-evaluation.png" width="850" alt="Evaluation dashboard">

### How It Works
The full pipeline made visible end-to-end, from the source PDFs through chunking, retrieval, reranking, the evidence gate, and grounded generation.

<img src="Screenshots/10-how-it-works.png" width="850" alt="How It Works pipeline">

---

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| PDF parsing | Docling (fallback: PyMuPDF for diagnostics) | Preserves headings, tables, reading order, and page boundaries |
| Chunking | Structure-aware, parent-child, 500–900 tokens | See [Chunking strategy](#chunking-strategy) |
| Embeddings | BAAI/bge-large-en-v1.5 (1024-dim) | Strong open-source retrieval; model version stored per-chunk for reproducibility |
| Vector store | PostgreSQL + pgvector, HNSW index | One database for metadata, vectors, and lexical search — no separate vector DB needed at this scale |
| Sparse retrieval | PostgreSQL full-text search (tsvector + GIN) | Catches exact identifiers embeddings can miss |
| Fusion | Reciprocal Rank Fusion (`k=60`) | Simple and robust, no blend-weight tuning needed |
| Reranking | Cross-encoder (`sentence-transformers`, `ms-marco-MiniLM-L-6-v2`) | Jointly scores (query, chunk) pairs — more precise than a bi-encoder alone |
| LLM | Gemini (model configurable via `GEMINI_MODEL`) | Fast, cheap, strong instruction-following |
| Grounding validator | Independent second LLM call | The layer that answers "how do you know it's not hallucinating" |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, httpx, pytest | Typed, async-capable, testable |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query | |
| Evaluation | Custom retrieval/citation/hallucination metrics + pytest | |
| Infra | Neon (cloud PostgreSQL + pgvector), local uvicorn/vite dev servers | No Docker/CI required for local development |

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+ with the [`pgvector`](https://github.com/pgvector/pgvector) extension
- A Google AI Studio API key for Gemini (`GOOGLE_API_KEY`)

## Setup

### 1. Database

```
createdb specguard
```

This project uses [Neon](https://neon.tech) (cloud Postgres with `pgvector` built in) rather than a local install — set `DATABASE_URL` in `.env` to your Neon connection string. The first Alembic migration also runs `CREATE EXTENSION IF NOT EXISTS vector`, but the extension must be installed on the Postgres server itself first.

### 2. Backend

```
python -m venv .venv
.venv/Scripts/activate   # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt   # includes ruff; use requirements.txt for a prod-only install

cp .env.example .env
# edit .env: set GOOGLE_API_KEY, and DATABASE_URL if not using the defaults

alembic upgrade head
uvicorn backend.main:app --reload
```

The API is now at `http://localhost:8000` (`/docs` for interactive OpenAPI docs).

### 3. Ingest a spec

Place a spec PDF under `data/` (see [`data/README.md`](data/README.md); 3GPP specs are publicly downloadable from the [3GPP specification archive](https://www.3gpp.org/specifications-technologies/specifications-by-series) but aren't redistributed in this repo), then:

```
curl -X POST localhost:8000/api/v1/ingest -H "Content-Type: application/json" -d '{
  "file_path": "data/23501-h70.pdf",
  "spec_number": "23.501",
  "release": "Rel-17",
  "version": "h70"
}'
```

Repeat for TS 23.502 and TS 23.503 to reproduce the full indexed corpus shown in the screenshots above.

### 4. Frontend

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`, proxying `/api` to the backend on port 8000 (see `frontend/vite.config.ts`).

## Environment variables

All configured via `.env` (see `.env.example`):

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Sync Postgres connection string | `postgresql+psycopg2://specguard:specguard@localhost:5432/specguard` |
| `DATABASE_URL_ASYNC` | Async Postgres connection string | `postgresql+asyncpg://specguard:specguard@localhost:5432/specguard` |
| `GOOGLE_API_KEY` | Gemini API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-flash-lite-latest` |
| `EMBEDDING_MODEL` | Sentence-embedding model | `BAAI/bge-large-en-v1.5` |
| `EMBEDDING_DIM` | Embedding vector dimension | `1024` |
| `RERANKER_MODEL` | Cross-encoder reranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` |
| `DENSE_TOP_K` / `SPARSE_TOP_K` | Candidates pulled from each retrieval path | `20` / `20` |
| `RRF_K` | Reciprocal Rank Fusion constant | `60` |
| `RERANK_TOP_K` | Chunks kept after reranking, sent to the LLM | `8` |
| `CHUNK_MIN_TOKENS` / `CHUNK_MAX_TOKENS` | Chunking bounds | `500` / `900` |
| `CHUNK_OVERLAP_TOKENS` | Overlap when a section must be split | `75` |
| `DEFAULT_RELEASE` | Fallback release when a question doesn't name one | `Rel-17` |
| `CORS_ORIGINS` | Allowed frontend origin(s) | `http://localhost:5173` |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `JWT_EXPIRE_MINUTES` | Auth token signing | — |

## Running tests

```
pytest tests/ -v
```

67+ tests cover chunking, retrieval fusion/reranking/evidence-gating, citation validation, the grounding validator, and evaluation metrics — all pure-logic tests that don't require a live database or LLM (fake clients are injected). Lint with `ruff check backend/ tests/`. Frontend: `cd frontend && npm run lint` (oxlint) and `npm run build` (`tsc -b && vite build`).

## Running the evaluation harness

The evaluation dataset (`evaluation/dataset.json`) has 45 questions across six categories, matching TRD §10:

| Category | Count | Purpose |
|---|---|---|
| Factual | 10 | Direct lookups |
| Procedural | 10 | Multi-step process questions |
| Comparison | 5 | Contrasting two concepts/entities |
| Multi-hop | 5 | Requires synthesizing more than one section |
| Out-of-scope | 10 | Expected outcome is a refusal |
| Adversarial / misleading | 5 | Designed to tempt an incorrect confident answer |

Metrics computed: **Recall@5, Precision@5, MRR** (retrieval quality), **Citation Correctness** (does the resolved SRC-ID actually support the claim?), **Refusal Accuracy**, and **Hallucination Rate** (unsupported answers ÷ total answers). Once specs are ingested:

```
curl "localhost:8000/api/v1/eval/run?limit=5"   # smoke run
curl "localhost:8000/api/v1/eval/run"           # full 45-question run
```

This writes `evaluation/results.json` and returns the basic-RAG → +hybrid+rerank → +full-guardrails ablation table (TRD §10) — the comparison that's meant to prove the guardrail layers matter, not just that the demo works.

`evaluation/dataset.json`'s `_meta.gold_sections_convention` explains how to populate `gold_sections` per question once you have a real ingested corpus and can manually verify relevant chunks — deliberately left empty rather than fabricated, since a wrong "ground truth" would silently corrupt every retrieval metric downstream. Until populated, `retrieval_metrics.py` skips a question's Recall@k/Precision@k/MRR contribution rather than scoring it as zero. A lightweight 10-question run's real, already-computed results are checked in at [`evaluation/lite_results.json`](evaluation/lite_results.json) — this is what the Evaluation page in the UI actually renders.

## Repository structure

```
SpecGuard AI/
├── backend/
│   ├── api/             # FastAPI routers: auth, ingest, retrieve, chat, eval
│   ├── ingestion/        # PDF parsing (Docling/PyMuPDF), chunking, manifest
│   ├── retrieval/        # dense/sparse search, RRF fusion, cross-encoder reranking
│   ├── generation/       # prompts, LLM client, guardrail pipeline (gate → generate → validate)
│   ├── evaluation/       # retrieval/citation/hallucination metrics, harness runner
│   ├── models.py         # SQLAlchemy models
│   ├── config.py         # environment-driven settings, including gate thresholds
│   └── main.py           # FastAPI app, router registration, CORS, rate limiting
├── frontend/
│   ├── src/pages/         # Landing, Login, Signup, Dashboard, Ask AI, Knowledge Base,
│   │                       # Document viewer, Evaluation, How It Works
│   ├── src/components/    # Shared UI: Sidebar, PageShell, ChatInput, KnowledgeBaseCards, …
│   ├── src/api/            # Typed API client
│   └── src/hooks/          # useAuth, useDocuments, useChat, …
├── data/                # source spec PDFs (not committed — see data/README.md)
├── tests/               # pytest suite (chunking, retrieval, guardrails, evaluation)
├── evaluation/          # dataset.json (45 Qs), lite_results.json, results.json
├── docs/
│   ├── TRD.md            # Technical Requirements Document — full design rationale
│   ├── PRD.md            # Product Requirements Document
│   └── adr/              # Architecture Decision Records
├── Screenshots/         # UI screenshots used in this README
├── alembic/             # database migrations
├── .env.example
└── requirements.txt
```

## Non-functional design notes

- **Performance:** embeddings are batched and cached at ingestion time; HNSW indexing keeps dense search fast; the reranking candidate set is capped rather than reranking the whole corpus; LLM output is only streamed after the evidence gate passes, so the system never streams a guess it later has to retract.
- **Observability:** every request logs `request_id, query, retrieval_latency_ms, reranking_latency_ms, llm_latency_ms, total_latency_ms, candidate_count, final_context_count, grounded, refused, model, spec_filter, release_filter` — enough to debug a bad answer after the fact without re-running it. API keys, secrets, and PII are never logged.
- **Security:** secrets live in environment variables only; all LLM calls happen server-side; CORS is restricted to the configured frontend origin; requests are rate-limited; input length is bounded; retrieved document text is always treated as data, never as instructions (the prompt-injection defense described above); the API never fetches arbitrary external URLs.

## Architecture decision records

Condensed from [`docs/adr/`](docs/adr/) and TRD §13:

- **ADR-1:** Docling over PyPDF2/pdfplumber — clause hierarchy and tables need structure preservation that plain text extraction loses.
- **ADR-2:** Hybrid dense+sparse over pure vector search — exact technical identifiers need lexical match, not just semantic similarity.
- **ADR-3:** Cross-encoder reranking on the fused top-N only, not the full corpus — a deliberate precision/speed tradeoff.
- **ADR-4:** Evidence gate placed pre-generation, calibrated on evaluation data, using multiple combined signals — cheaper to refuse early, and a single similarity number isn't robust enough alone.
- **ADR-5:** Source-ID citation mapping resolved server-side — makes fabricated citations structurally impossible rather than merely instructed against.
- **ADR-6:** An independent grounding validator as a second, separate model call — kept even though some competing designs omit it, because a generator is a poor judge of its own hallucinations and this is the most defensible answer to "how do you know it's not hallucinating."
- **ADR-7:** PostgreSQL + pgvector over a dedicated vector database — one operational database is sufficient at this corpus size and keeps the deployment simple.
- **ADR-8:** Release treated as first-class metadata with explicit conflict surfacing, not silent merging — correctness matters more than a clean-looking single answer.

## Known limitations

- Evidence-gate thresholds (`backend/config.py`) are explicitly-labeled placeholders pending calibration against a larger evaluation set (ADR-4).
- The full 45-question ablation dataset's `gold_sections` are empty pending manual relevance judgments against the real ingested corpus — only the lightweight 10-question eval run has been executed and scored so far.
- The Evaluation page's Ragas-based metrics (Faithfulness, Answer Relevance, Context Relevance) and the Basic RAG / +Hybrid Retrieval ablation variants have not been run yet; the UI honestly labels these "Coming soon" / "Not yet run" rather than showing placeholder numbers.
- DB access is synchronous (SQLAlchemy `Session`, not the async engine already configured via `DATABASE_URL_ASYNC`) — fine at this scale, but §11's "async I/O" guidance isn't fully realized.
- A numbered call-flow step list in TS 23.501 is occasionally interpreted as a section heading by the current heading-detection logic, resulting in a Clause 3/4 title mismatch in the document explorer. This does not affect core retrieval, grounding, citation, or evidence-explorer behavior.
