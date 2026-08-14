# ADR-8: Release as first-class metadata, with explicit conflict surfacing

## Status
Accepted

## Context
3GPP specs evolve across releases (Rel-15, Rel-16, Rel-17, ...), and the same clause number can describe materially different behavior across releases. Silently blending chunks from different releases into one answer — or picking one release without saying so — produces an answer that looks authoritative but may not match the release the user actually cares about.

## Decision
Every `chunks` row carries `release` from its parent `Document` (`backend/models.py`); retrieval can filter by a requested release; the chunker refuses to mix releases within a single chunk (§3, rule 6); and the generation prompt explicitly instructs the model to surface — not silently resolve — conflicts between sources from different releases (§6, rule 6).

## Consequences
An answer either respects the user's requested release or, when unspecified, is expected to say which release it's answering from — the API and prompt are both built around that expectation, though enforcing "always states the release" end-to-end depends on the model actually following rule 6, which isn't independently validated the way citations and grounding are (§7). Correctness costs a slightly more hedged answer in ambiguous cases, which is the intended trade-off for a standards-compliance tool.
