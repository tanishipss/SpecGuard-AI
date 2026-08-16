// Static snapshot of the real, already-run lightweight evaluation
// (evaluation/lite_results.json). Not fetched live — this page must not
// trigger a new evaluation run.
export const LITE_EVAL_SUMMARY = {
  questionCount: 10,
  scoredQuestionCount: 7,
  totalWallTimeSeconds: 117.3,
  citationCorrectness: 1.0,
  refusalAccuracy: 0.7,
  recallAt5: 0.57,
  // Averaged from the 7 scored cases' retrieval_metrics.precision_at_5 in
  // evaluation/lite_results.json (0.2+0+0.4+0+0+0.2+0.2)/7 — not previously
  // surfaced in the summary object, though the per-case data was always there.
  precisionAt5: 0.14,
  mrr: 0.27,
  hallucinationRate: 0.2,
}
