import json
import re
from functools import lru_cache
from typing import Protocol

from backend.config import settings


class LLMClient(Protocol):
    def generate(self, system_prompt: str, question: str) -> str: ...

    def generate_json(self, prompt: str) -> dict: ...


class GeminiClient:
    """Thin wrapper around the Gemini API. Constructed lazily so importing
    this module never requires GOOGLE_API_KEY to be set (e.g. in tests).
    """

    def __init__(self) -> None:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)
        self._model = genai.GenerativeModel(settings.gemini_model)

    def generate(self, system_prompt: str, question: str) -> str:
        response = self._model.generate_content(f"{system_prompt}\n\n{question}")
        return response.text

    def generate_json(self, prompt: str) -> dict:
        response = self._model.generate_content(prompt)
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
