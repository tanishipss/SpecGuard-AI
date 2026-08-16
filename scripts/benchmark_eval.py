"""Diagnostic-only: benchmark LLM call count/latency for 5 questions x 3
variants. Wraps LLMClient.generate/generate_json with timing + retry/backoff
(NOT present in the production client) purely so this benchmark can survive
the free-tier 15 req/min quota instead of crashing like the full run did.
Does not touch the DB or write evaluation/results.json.
"""

import logging
import sys
import time

from backend.db import SessionLocal
from backend.evaluation.dataset import load_dataset
from backend.evaluation.runner import run_ablation
from backend.generation.llm_client import get_default_client

logging.basicConfig(level=logging.WARNING, stream=sys.stdout)

call_log = []


class TimingRetryClient:
    """Wraps the real GeminiClient: records (method, latency) per call and
    retries once on 429 after sleeping past the quota's suggested delay.
    """

    def __init__(self, inner):
        self._inner = inner

    def _call(self, method_name, fn):
        for attempt in range(3):
            t0 = time.perf_counter()
            try:
                result = fn()
                latency = time.perf_counter() - t0
                call_log.append((method_name, latency, "ok"))
                return result
            except Exception as e:
                latency = time.perf_counter() - t0
                is_429 = "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e)
                call_log.append((method_name, latency, "429" if is_429 else "error"))
                if is_429 and attempt < 2:
                    print(f"  rate-limited on {method_name}, sleeping 12s (attempt {attempt+1})")
                    time.sleep(12)
                    continue
                raise

    def generate(self, system_prompt, question):
        return self._call("generate", lambda: self._inner.generate(system_prompt, question))

    def generate_json(self, prompt):
        return self._call("generate_json", lambda: self._inner.generate_json(prompt))


def main():
    db = SessionLocal()
    try:
        questions = load_dataset()[:5]
        client = TimingRetryClient(get_default_client())

        t0 = time.perf_counter()
        run_ablation(db, client, questions)
        total_time = time.perf_counter() - t0

        ok_calls = [c for c in call_log if c[2] == "ok"]
        rate_limited = [c for c in call_log if c[2] == "429"]
        latencies = [c[1] for c in ok_calls]

        print("\n=== BENCHMARK RESULTS ===")
        print(f"Total LLM calls attempted: {len(call_log)}")
        print(f"Successful calls: {len(ok_calls)}")
        print(f"Rate-limited (429) events: {len(rate_limited)}")
        if latencies:
            print(f"Avg latency per successful call: {sum(latencies)/len(latencies):.2f}s")
            print(f"Min/Max latency: {min(latencies):.2f}s / {max(latencies):.2f}s")
        print(f"Total wall time (5Q x 3 variants, includes backoff sleeps): {total_time:.1f}s")
        print("BENCHMARK_DONE")
    finally:
        db.close()


if __name__ == "__main__":
    main()
