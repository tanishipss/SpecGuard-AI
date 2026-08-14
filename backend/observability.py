import json
import logging
import sys

# Fields intentionally never logged here: API keys/secrets, and any raw
# user PII beyond the question text itself (TRD §11 — "never log API keys,
# secrets, or PII").
_LOGGER_NAME = "specguard.requests"


def configure_logging() -> None:
    logger = logging.getLogger(_LOGGER_NAME)
    if logger.handlers:
        return  # idempotent — safe to call from multiple entry points
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def log_chat_request(**fields) -> None:
    """Emit one structured JSON line per /chat request with the fields
    required by TRD §11: request_id, query, retrieval_latency_ms,
    reranking_latency_ms, llm_latency_ms, total_latency_ms, candidate_count,
    final_context_count, grounded, refused, model, spec_filter,
    release_filter.
    """
    logger = logging.getLogger(_LOGGER_NAME)
    logger.info(json.dumps(fields, default=str))
