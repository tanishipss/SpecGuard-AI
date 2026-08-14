import json
from dataclasses import asdict
from pathlib import Path

from backend.evaluation.schemas import EvalCaseResult, EvalQuestion, EvalRunResult

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_PATH = REPO_ROOT / "evaluation" / "dataset.json"
DEFAULT_RESULTS_PATH = REPO_ROOT / "evaluation" / "results.json"


def load_dataset(path: Path | None = None) -> list[EvalQuestion]:
    path = path or DEFAULT_DATASET_PATH
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        EvalQuestion(
            id=q["id"],
            category=q["category"],
            question=q["question"],
            release=q.get("release"),
            expected_refusal=q["expected_refusal"],
            gold_sections=q.get("gold_sections", []),
        )
        for q in data["questions"]
    ]


def save_results(runs: list[EvalRunResult], path: Path | None = None) -> None:
    path = path or DEFAULT_RESULTS_PATH
    payload = {
        "variants": [
            {
                "variant_name": run.variant_name,
                "generation_metrics": asdict(run.generation_metrics),
                "retrieval_metrics": asdict(run.retrieval_metrics) if run.retrieval_metrics else None,
                "cases": [asdict(c) for c in run.cases],
            }
            for run in runs
        ]
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def cases_to_dicts(cases: list[EvalCaseResult]) -> list[dict]:
    return [asdict(c) for c in cases]
