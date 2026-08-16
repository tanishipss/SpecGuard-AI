import json
import re
import time
from functools import lru_cache
from typing import Protocol

from backend.config import settings

MAX_RETRIES = 4
BASE_BACKOFF_SECONDS = 8


class LLMClient(Protocol):
    def generate(self, system_prompt: str, question: str) -> str: ...

    def generate_json(self, prompt: str) -> dict: ...


def _retry_delay_seconds(exc: Exception, attempt: int) -> float:
    """Honor the API's own suggested retry_delay on 429s (it knows the
    actual quota reset timing better than a guess would); fall back to
    plain exponential backoff for other transient errors.
    """
    match = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", str(exc))
    if match:
        return float(match.group(1)) + 1  # small margin past the API's own estimate
    return BASE_BACKOFF_SECONDS * (2**attempt)


def _is_retryable(exc: Exception) -> bool:
    text = str(exc)
    return "RESOURCE_EXHAUSTED" in text or "429" in text or "503" in text or "UNAVAILABLE" in text


class GeminiClient:
    """Thin wrapper around the Gemini API. Constructed lazily so importing
    this module never requires GOOGLE_API_KEY to be set (e.g. in tests).
    """

    def __init__(self) -> None:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)
        self._model = genai.GenerativeModel(settings.gemini_model)

    def _call_with_retry(self, prompt: str):
        last_exc = None
        for attempt in range(MAX_RETRIES):
            try:
                return self._model.generate_content(prompt)
            except Exception as exc:  # noqa: BLE001 - broad on purpose, see _is_retryable
                last_exc = exc
                if not _is_retryable(exc) or attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(_retry_delay_seconds(exc, attempt))
        raise last_exc  # pragma: no cover - loop always returns or raises above

    def generate(self, system_prompt: str, question: str) -> str:
        response = self._call_with_retry(f"{system_prompt}\n\n{question}")
        return response.text

    def generate_json(self, prompt: str) -> dict:
        response = self._call_with_retry(prompt)
        return parse_json_response(response.text)


def parse_json_response(text: str) -> dict:
    """Strip markdown code fences (```json ... ```) that Gemini often wraps
    JSON responses in, then parse. Raises json.JSONDecodeError if the
    remaining text still isn't valid JSON.
    """
    stripped = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", stripped, re.DOTALL)
    if fence_match:
        stripped = fence_match.group(1)
    return json.loads(stripped)


@lru_cache(maxsize=1)
def get_default_client() -> GeminiClient:
    return GeminiClient()
