import logging

from backend.generation.llm_client import LLMClient
from backend.generation.prompts import build_grounding_prompt
from backend.generation.schemas import GroundingVerdict

logger = logging.getLogger(__name__)


def check_grounding(client: LLMClient, answer: str, chunks) -> GroundingVerdict:
    """Independent second model call that claim-checks the answer against
    its own cited context (TRD §7.4 / ADR-6). A generator is a poor judge
    of its own hallucinations, so this is a separate, narrowly-scoped call
    rather than asking the same completion to self-critique.

    Fails closed: if the validator's response can't be parsed as the
    expected JSON, treat it as a grounding failure rather than silently
    passing an unverifiable answer through.
    """
    prompt = build_grounding_prompt(answer, chunks)
    try:
        result = client.generate_json(prompt)
    except Exception:
        logger.exception("Grounding validator call failed or returned unparseable output")
        return GroundingVerdict(verdict="fail", unsupported_claims=["grounding validator call failed"])

    verdict = result.get("verdict")
    unsupported_claims = result.get("unsupported_claims", [])

    if verdict not in ("pass", "fail"):
        logger.warning("Grounding validator returned unexpected verdict: %r", verdict)
        return GroundingVerdict(verdict="fail", unsupported_claims=["unparseable verdict from grounding validator"])

    return GroundingVerdict(verdict=verdict, unsupported_claims=unsupported_claims)
