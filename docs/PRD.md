# Product Requirements Document (PRD)
## SpecGuard AI — 3GPP Standards RAG Chatbot

**Status:** Stub — expand as product decisions firm up. See `docs/TRD.md` for the technical design these requirements drive.

---

## Problem statement

Engineers working with 3GPP standards (5G System Architecture: TS 23.501/23.502/23.503) need fast, precise answers to questions about specific procedures, functions, and reference points — but a wrong or fabricated answer about a clause is worse than no answer, because it can lead to an incorrect implementation decision. Generic LLM chat interfaces answer confidently regardless of whether they actually have grounding in the real spec text, and give the reader no way to check.

SpecGuard AI exists to answer 3GPP standards questions with **verifiable grounding**: every factual claim traces to a real, inspectable source chunk (spec, section, page), and the system refuses rather than guesses when it doesn't have sufficient evidence.

## Users

- **Primary:** Telecom engineers and standards-compliance reviewers who need to quickly locate and confirm the correct 3GPP clause behind a technical question, without reading the full spec PDF.
- **Secondary:** Engineers new to 5G Core architecture who want an explainable on-ramp into procedures like registration, PDU session establishment, or handover — with citations they can verify against the source rather than take on faith.

## Success criteria

- **Grounding integrity:** citation correctness and hallucination rate (TRD §10) measured against a real evaluation set, not just a demo showing correct answers to friendly questions.
- **Appropriate refusal:** out-of-scope and adversarial questions (TRD §10's 15 such dataset questions) are refused, not answered from outside knowledge — refusal accuracy is a first-class metric, not an afterthought.
- **Retrieval quality:** Recall@5/Precision@5/MRR against a human-verified gold-section set (`evaluation/dataset.json`'s `gold_sections`), so retrieval quality claims are backed by real judgment, not circular self-scoring.
- **Guardrails demonstrably matter:** the 3-variant ablation (Basic RAG → +Hybrid retrieval+reranking → +Evidence gate+citation validation+grounding validator, TRD §10) shows a measurable improvement at each stage — the differentiator isn't just "we have a RAG chatbot," it's "here's proof each guardrail layer earns its cost."
- **Usable end-to-end product**, not just an API: authentication, a workspace dashboard, an Ask AI console, a browsable knowledge base with document viewer, and an evaluation dashboard that shows real (not fabricated) numbers, including honest "partial run" states when the full dataset hasn't been scored yet.

## Non-goals (current scope)

- Not a general-purpose telecom chatbot — scoped to the three ingested Rel-17 specs (23.501/23.502/23.503); questions about un-ingested specs (e.g. TS 38.211, TS 33.501) are expected to be refused, not answered from the model's general training knowledge.
- Not a multi-tenant SaaS product in this phase — auth exists for workspace/session separation, not for commercial multi-org isolation.
- Not optimized for very large corpora — the architecture (PostgreSQL + pgvector, ADR-7) is a deliberate choice for this corpus size, not a claim of horizontal scalability.
