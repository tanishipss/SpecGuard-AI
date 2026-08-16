# ADR-9: gemini-flash-lite-latest over gemini-2.5-flash

## Status
Accepted

## Context
TRD §1 originally specified `gemini-2.5-flash` as the generation model. The pipeline makes several LLM calls per question beyond generation itself — an independent grounding-validator call (ADR-6) and, in evaluation, a hallucination-judge call and Ragas's own LLM-backed metrics — so per-question LLM cost is a multiple of a single chat call, not a single call.

## Decision
Configure `gemini_model = "gemini-flash-lite-latest"` (`backend/config.py`) instead of `gemini-2.5-flash`, for both generation and the grounding validator.

## Consequences
Lower cost and latency per call, which matters directly given the guardrail pipeline's 2-3x LLM-call multiplier per question and the repeated full-dataset eval/ablation runs this project needs to run during development. The tradeoff is a possibly less capable model for nuanced claim-entailment judgments in the grounding validator — if evaluation results show the lite model missing subtle unsupported claims that the full flash model would catch, revisit this before treating hallucination-rate numbers as final. TRD §1 has been updated to reflect this as the actual configured model rather than leaving the document silently out of sync with the code.
