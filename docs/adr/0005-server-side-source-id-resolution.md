# ADR-5: Source-ID citation mapping resolved server-side

## Status
Accepted

## Context
If the model is asked to write out document/section/page numbers directly in its answer, there is nothing stopping it from inventing a plausible-looking one — a fabricated citation reads identically to a real one to anyone who doesn't cross-check the spec.

## Decision
Assign each retrieved chunk a short `SRC-NNN` ID server-side before generation (`backend/retrieval/pipeline.py::assign_source_ids`); the model is instructed to cite only these IDs; the backend resolves each cited ID back to `{spec_number, release, section, page, snippet}` from the request's own resolved context, never from the model's output (`backend/generation/citation.py`).

## Consequences
A fabricated citation is now structurally impossible to slip through undetected — an ID either exists in this request's map or it doesn't, and citation validation rejects the answer if any cited ID doesn't resolve (§7.3). The trade-off is a slightly less natural-looking answer during generation (the model writes `[SRC-002]` rather than a spec name) — resolved into human-readable form only at the response layer.
