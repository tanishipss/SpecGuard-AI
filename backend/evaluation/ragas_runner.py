"""Ragas-based generation-quality scoring (TRD §10): Faithfulness, Answer
Relevance, and Context Relevance.

This is a distinct evaluation surface from generation_metrics.py's
hallucination/citation checks. Those are this project's own deterministic
and LLM-judge checks that gate the guardrail pipeline itself; Ragas is the
standard third-party library the TRD names explicitly, run separately so
its scores aren't conflated with the pipeline's own self-reported verdicts.

Wired to this project's actual Gemini setup rather than requiring an
OPENAI_API_KEY, since this project has no OpenAI dependency anywhere else.
Reuses the same GOOGLE_API_KEY / GEMINI_MODEL already configured for the
main generation pipeline (see backend/config.py).

The LLM side is a minimal direct wrapper around `google.generativeai`
(_DirectGeminiRagasLLM below) — the exact same SDK
backend/generation/llm_client.py already uses successfully — rather than
langchain_google_genai's ChatGoogleGenerativeAI. That was tried first, but
langchain-google-genai==1.0.10 (the version compatible with ragas's
langchain-core<0.3 pin) calls the underlying google-generativeai client
with a `temperature` kwarg that this project's pinned google-generativeai
version (0.8.3, required by the main app) doesn't accept — a real,
reproducible TypeError confirmed via a live run against this project's
actual database, not a hypothetical. Embeddings (only needed for Answer
Relevance) don't hit that code path, so GoogleGenerativeAIEmbeddings is
still used for those.

Note on "Context Relevance": ragas 0.1.x removed the `context_relevancy`
metric present in older releases. `context_precision` is the closest
available replacement — it also scores whether the retrieved context was
actually useful for producing the answer — and is what the
"context_relevance" key returned here is populated from. This is a real
ragas API change being worked around, not a substitution invented to paper
over a gap.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass

from langchain_core.outputs import Generation, LLMResult
from ragas import evaluate
from ragas.llms.base import BaseRagasLLM
from ragas.metrics import answer_relevancy, context_precision, faithfulness

from backend.config import settings

logger = logging.getLogger(__name__)

REQUIRED_KEYS = ("question", "contexts", "answer", "ground_truth")


@dataclass
class _DirectGeminiRagasLLM(BaseRagasLLM):
    """A ragas BaseRagasLLM backed directly by google.generativeai, so
    ragas's judge prompts (faithfulness, answer relevance, context
    precision) run through the exact same SDK call this project's own
    GeminiClient already uses — sidestepping langchain-google-genai's
    incompatible `temperature` forwarding (see module docstring).
    """

    model_name: str = ""
    api_key: str = ""

    def __post_init__(self) -> None:
        import google.generativeai as genai

        genai.configure(api_key=self.api_key)
        self._model = genai.GenerativeModel(self.model_name)

    def _complete(self, prompt_text: str) -> str:
        response = self._model.generate_content(prompt_text)
        return response.text

    def generate_text(self, prompt, n: int = 1, temperature=1e-8, stop=None, callbacks=None) -> LLMResult:
        text = self._complete(prompt.to_string())
        return LLMResult(generations=[[Generation(text=text)]])

    async def agenerate_text(self, prompt, n: int = 1, temperature=None, stop=None, callbacks=None) -> LLMResult:
        # google-generativeai's sync client has no asyncio-native call path
        # here; ragas's own retry/concurrency wrapper still parallelizes
        # across rows at the event-loop level even though each individual
        # call is synchronous underneath.
        return self.generate_text(prompt, n=n, temperature=temperature or 1e-8, stop=stop, callbacks=callbacks)


def _build_gemini_backends():
    """Constructed lazily so importing this module never requires
    GOOGLE_API_KEY to be set (e.g. in tests) — mirrors the same lazy
    pattern backend/generation/llm_client.py uses for the main LLM client.
    """
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    if not settings.google_api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set — run_ragas_eval needs a real Gemini "
            "credential to score Faithfulness/Answer Relevance/Context "
            "Relevance (all three require LLM calls, and Answer Relevance "
            "also requires an embedding model)."
        )

    llm = _DirectGeminiRagasLLM(model_name=settings.gemini_model, api_key=settings.google_api_key)
    # "models/embedding-001" (the commonly-documented default) 404s against
    # this project's API key/version — confirmed live via genai.list_models()
    # filtered to embedContent support; "models/gemini-embedding-001" is
    # what's actually available.
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.google_api_key,
    )
    return llm, embeddings


def run_ragas_eval(eval_rows: list[dict]) -> dict[str, float | None]:
    """Score a batch of generated answers with Ragas.

    Each row in `eval_rows` must have:
      - question: str
      - contexts: list[str]  (the retrieved chunk text actually shown to the LLM)
      - answer: str          (the pipeline's generated answer)
      - ground_truth: str    (reference answer, from evaluation/dataset.json)

    Returns aggregate scores in [0, 1], or None for a metric ragas couldn't
    compute (e.g. a per-row judge call failed) — ragas reports that
    internally as NaN rather than raising, and NaN isn't valid JSON, so it
    would otherwise surface as an opaque 500 at the API layer instead of an
    honest missing value:
      {"faithfulness": ..., "answer_relevance": ..., "context_relevance": ...}

    Rows where the pipeline refused (no real answer/contexts) should be
    filtered out by the caller before this is called — these metrics
    assume a real answer was generated from real context, and scoring a
    refusal against them isn't meaningful. See
    `build_ragas_rows_from_queries` in ragas_dataset.py, which already
    excludes refusals.
    """
    if not eval_rows:
        raise ValueError("run_ragas_eval called with no rows to score")

    missing = [i for i, row in enumerate(eval_rows) if not all(k in row for k in REQUIRED_KEYS)]
    if missing:
        raise ValueError(f"eval_rows[{missing[0]}] is missing one of {REQUIRED_KEYS}")

    from datasets import Dataset

    dataset = Dataset.from_dict(
        {
            "question": [row["question"] for row in eval_rows],
            "contexts": [row["contexts"] for row in eval_rows],
            "answer": [row["answer"] for row in eval_rows],
            "ground_truth": [row["ground_truth"] for row in eval_rows],
        }
    )

    llm, embeddings = _build_gemini_backends()

    logger.info("Running Ragas evaluation over %d rows", len(eval_rows))
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_precision],
        llm=llm,
        embeddings=embeddings,
    )

    scores = dict(result)
    return {
        "faithfulness": _clean_score(scores["faithfulness"]),
        "answer_relevance": _clean_score(scores["answer_relevancy"]),
        "context_relevance": _clean_score(scores["context_precision"]),
    }


def _clean_score(value: float) -> float | None:
    value = float(value)
    return None if math.isnan(value) else value
