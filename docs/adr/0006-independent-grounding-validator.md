# ADR-6: Independent grounding validator as a second, separate model call

## Status
Accepted

## Context
A generator asked to self-critique its own output tends to rationalize it rather than catch it — the same weights that produced an unsupported claim are being asked to judge whether that claim is supported, with no independent signal to disagree.

## Decision
Run a second, narrowly-scoped model call (`backend/generation/grounding.py::check_grounding`) whose only job is claim-by-claim entailment checking of the answer against its cited context, after generation and after citation validation both pass.

## Consequences
This is the layer most RAG demos skip, and it's the most defensible answer to "how do you know it's not hallucinating" — because the check is structurally independent of whichever call produced the answer, not because either individual call is more reliable. It roughly doubles the LLM cost and latency of every non-refused answer. It's kept even though it's absent from lighter-weight designs, because for a domain like 3GPP compliance the cost of a plausible-sounding wrong answer is worse than doubled latency. It fails closed — if the validator's own response can't be parsed, that counts as a grounding failure, not a pass.
