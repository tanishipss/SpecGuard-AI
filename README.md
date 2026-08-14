# SpecGuard AI — 3GPP Standards RAG Chatbot

A retrieval-augmented chatbot over 3GPP System Architecture specs (TS 23.501, 23.502, 23.503), built around a guardrail pipeline that makes fabricated citations structurally impossible and refuses rather than hallucinates when evidence is thin. Full design rationale in [`docs/TRD.md`](docs/TRD.md) and [`docs/adr/`](docs/adr/).

## Architecture

Modular monolith: `backend/{ingestion,retrieval,generation,evaluation,api}` as separate internal modules behind one FastAPI service, plus a React frontend. See `docs/TRD.md` §2 for the full pipeline diagram.

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+ with the [`pgvector`](https://github.com/pgvector/pgvector) extension installed
- A Google AI Studio API key for Gemini (`GOOGLE_API_KEY`)

## Setup

### 1. Database

Create a database and enable `pgvector` (the first Alembic migration also runs `CREATE EXTENSION IF NOT EXISTS vector`, but the extension must be installed on the Postgres server itself first):

```
createdb specguard
```

If you'd rather not install Postgres+pgvector locally, `docker-compose.yml` in the repo root brings up a pre-built `pgvector/pgvector` image — optional, not required.

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

Place a spec PDF under `data/` (see [`data/README.md`](data/README.md)), then:

```
curl -X POST localhost:8000/api/v1/ingest -H "Content-Type: application/json" -d '{
  "file_path": "data/23501-h70.pdf",
  "spec_number": "23.501",
  "release": "Rel-17",
  "version": "h70"
}'
```

### 4. Frontend

```
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`, proxying `/api` to the backend on port 8000 (see `frontend/vite.config.ts`).

## Running tests

```
pytest tests/ -v
```

67+ tests cover chunking, retrieval fusion/reranking/evidence-gating, citation validation, the grounding validator, and evaluation metrics — all pure-logic tests that don't require a live database or LLM (fake clients are injected). Lint with `ruff check backend/ tests/`.

## Running the evaluation harness

Once you have specs ingested:

```
curl "localhost:8000/api/v1/eval/run?limit=5"   # smoke run
curl "localhost:8000/api/v1/eval/run"           # full 45-question ablation
```

Writes `evaluation/results.json` and returns the required basic-RAG → +hybrid+rerank → +full-guardrails ablation table (TRD §10). See [`evaluation/dataset.json`](evaluation/dataset.json)'s `_meta` block for how to populate `gold_sections` once you've manually verified relevant chunks against a real ingested corpus — retrieval metrics (Recall@k/Precision@k/MRR) are skipped per-question until that's filled in, rather than scored as zero.

## CI

`.github/workflows/ci.yml` runs backend lint+tests and frontend lint+build on every push/PR — no Docker step; Docker is optional local tooling only (see `docker-compose.yml`).

## Known gaps

- Evidence-gate thresholds (`backend/config.py`) are explicitly-labeled placeholders pending calibration against real eval results (ADR-4).
- `evaluation/dataset.json`'s `gold_sections` are empty pending a real ingested corpus + manual relevance judgments.
- No live end-to-end verification yet against a running Postgres + real Gemini calls in this environment.
- DB access is synchronous (SQLAlchemy `Session`, not the async engine already configured via `DATABASE_URL_ASYNC`) — fine at this scale, but §11's "async I/O" guidance isn't fully realized.
