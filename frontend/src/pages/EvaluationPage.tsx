import { AppShell } from '../components/layout/AppShell'
import { PageShell } from '../components/layout/PageShell'
import { LITE_EVAL_SUMMARY } from '../data/evaluation'
import { useEvalAblation, useEvalRun } from '../hooks/useEvalRun'

type Tier = 'excellent' | 'attention' | 'improvement' | 'low-ranking'

const TIER_LABEL: Record<Tier, string> = {
  excellent: 'Excellent',
  attention: 'Needs attention',
  improvement: 'Needs improvement',
  'low-ranking': 'Low retrieval ranking quality',
}

const TIER_CLASS: Record<
  Tier,
  { text: string; dot: string; bar: string; iconBg: string; iconText: string; ringRgba: string }
> = {
  excellent: {
    text: 'text-sage',
    dot: 'bg-sage',
    bar: 'bg-sage',
    iconBg: 'bg-sage-soft',
    iconText: 'text-forest',
    ringRgba: 'rgba(8,127,106,0.16)',
  },
  attention: {
    text: 'text-warning',
    dot: 'bg-warning',
    bar: 'bg-warning',
    iconBg: 'bg-warning-soft',
    iconText: 'text-warning',
    ringRgba: 'rgba(183,121,31,0.16)',
  },
  improvement: {
    text: 'text-error',
    dot: 'bg-error',
    bar: 'bg-error',
    iconBg: 'bg-error-soft',
    iconText: 'text-error',
    ringRgba: 'rgba(185,28,28,0.14)',
  },
  'low-ranking': {
    text: 'text-error',
    dot: 'bg-error',
    bar: 'bg-error',
    iconBg: 'bg-error-soft',
    iconText: 'text-error',
    ringRgba: 'rgba(185,28,28,0.14)',
  },
}

// Higher-is-better tiering for Citation Correctness / Refusal Accuracy / Recall@5.
function higherIsBetterTier(pct: number): Tier {
  if (pct >= 85) return 'excellent'
  if (pct >= 60) return 'attention'
  return 'improvement'
}

// MRR gets its own tier label per the user's explicit spec — very low
// ranking quality reads as its own category, not just "needs improvement".
function mrrTier(pct: number): Tier {
  if (pct >= 85) return 'excellent'
  if (pct >= 60) return 'attention'
  if (pct >= 35) return 'improvement'
  return 'low-ranking'
}

// Hallucination Rate is inverted — lower is better.
function hallucinationTier(pct: number): Tier {
  if (pct <= 10) return 'excellent'
  if (pct <= 25) return 'attention'
  return 'improvement'
}

const citationPct = Math.round(LITE_EVAL_SUMMARY.citationCorrectness * 100)
const refusalPct = Math.round(LITE_EVAL_SUMMARY.refusalAccuracy * 100)
const recallPct = Math.round(LITE_EVAL_SUMMARY.recallAt5 * 100)
const mrrPct = Math.round(LITE_EVAL_SUMMARY.mrr * 100)
const hallucinationPct = Math.round(LITE_EVAL_SUMMARY.hallucinationRate * 100)

const citationTier = higherIsBetterTier(citationPct)
const refusalTier = higherIsBetterTier(refusalPct)
const recallTier = higherIsBetterTier(recallPct)
const mrrRankTier = mrrTier(mrrPct)
const hallucinationRateTier = hallucinationTier(hallucinationPct)

// Small line icons — deliberately plain strokes, no fills, matching the
// restrained icon-tile treatment used elsewhere in the app.
const ICONS = {
  citation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 8h10M7 12h10M7 16h6M5 3h14a1 1 0 0 1 1 1v16l-4-3H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3 5 6v6c0 4.2 3 7.4 7 9 4-1.6 7-4.8 7-9V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  rank: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  spark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  target: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  ),
}

// Still static (from the 10-question lite eval) — not part of this pass's
// "show n= and mute low-confidence numbers" treatment, which only applies
// to the metrics explicitly sourced from the live endpoints below.
const METRICS: { key: string; label: string; pct: number; tier: Tier; icon: keyof typeof ICONS }[] = [
  { key: 'refusal', label: 'Refusal Accuracy', pct: refusalPct, tier: refusalTier, icon: 'shield' },
  { key: 'recall', label: 'Recall@5', pct: recallPct, tier: recallTier, icon: 'search' },
  { key: 'mrr', label: 'MRR', pct: mrrPct, tier: mrrRankTier, icon: 'rank' },
  { key: 'hallucination', label: 'Hallucination Rate', pct: hallucinationPct, tier: hallucinationRateTier, icon: 'spark' },
]

// The full intended dataset size — used to decide whether a metric's n is
// "low confidence" (n < FULL_DATASET_SIZE) and should render muted rather
// than in the normal bold metric color.
const FULL_DATASET_SIZE = 45

// Citation Correctness, Precision@5, Recall@5, MRR, Faithfulness, Answer
// Relevance, and Context Precision are sourced live from GET
// /api/v1/eval/run — real scores, freshly recomputed over whatever's been
// seeded via evaluation/seed_eval_queries.py, "Coming soon" otherwise.
// ("Context Precision", not "Context Relevancy" — ragas 0.1.x removed that
// metric; see backend/evaluation/ragas_runner.py.) `nKey` says which of the
// response's sample-size fields backs that particular metric —
// Precision@5/Recall@5/MRR share one gold_sections-gated subset, distinct
// from the rest. `tierFn` defaults to higherIsBetterTier; MRR reuses the
// same 4-tier scale as its static card above (very low ranking quality
// reads as its own category).
const LIVE_METRIC_DEFS: {
  key:
    | 'citation_correctness_rate'
    | 'precision_at_5'
    | 'recall_at_5'
    | 'mrr'
    | 'faithfulness'
    | 'answer_relevance'
    | 'context_relevance'
  label: string
  icon: keyof typeof ICONS
  nKey: 'scored_question_count' | 'precision_scored_question_count'
  tierFn?: (pct: number) => Tier
}[] = [
  { key: 'citation_correctness_rate', label: 'Citation Correctness', icon: 'citation', nKey: 'scored_question_count' },
  { key: 'precision_at_5', label: 'Precision@5', icon: 'target', nKey: 'precision_scored_question_count' },
  { key: 'recall_at_5', label: 'Recall@5', icon: 'search', nKey: 'precision_scored_question_count' },
  { key: 'mrr', label: 'MRR', icon: 'rank', nKey: 'precision_scored_question_count', tierFn: mrrTier },
  { key: 'faithfulness', label: 'Faithfulness', icon: 'spark', nKey: 'scored_question_count' },
  { key: 'answer_relevance', label: 'Answer Relevance', icon: 'shield', nKey: 'scored_question_count' },
  { key: 'context_relevance', label: 'Context Precision', icon: 'search', nKey: 'scored_question_count' },
]

const VARIANT_LABELS: Record<string, string> = {
  basic_rag: 'Basic RAG',
  hybrid_rerank: '+Hybrid Retrieval + Reranking',
  full_system: 'Full System',
}

// A percentage + its sample size, e.g. "100% (n=1)" — muted when n is below
// the full intended dataset size, so a low-confidence number never reads
// visually the same as a trustworthy one.
function MetricValue({ pct, n }: { pct: number; n: number }) {
  const lowConfidence = n < FULL_DATASET_SIZE
  return (
    <p
      className={`font-display text-[32px] font-semibold leading-none tracking-[-0.035em] ${
        lowConfidence ? 'text-ink-faint' : 'text-ink'
      }`}
    >
      {pct}%<span className="ml-1.5 font-mono text-[13px] font-medium text-ink-faint">(n={n})</span>
    </p>
  )
}

// Real, unedited findings from the lightweight evaluation run — split into a
// short lead-in (title) and the supporting detail (description) so they read
// as structured insights rather than one flat paragraph each.
const FINDINGS: { title: string; detail: string }[] = [
  {
    title: 'Citation validity and grounding are separate concerns.',
    detail: 'An answer can cite a real source and still fail an independent grounding check.',
  },
  {
    title: 'Retrieval recall is a limiting factor.',
    detail: "The correct clause isn't always retrieved.",
  },
  {
    title: 'The generator can be overly conservative.',
    detail: 'Sufficient evidence was retrieved, but it declined to answer.',
  },
]

// Order matches the TRD §1 architecture exactly: Retrieval → Evidence Gate →
// Generation → Citation Validation → Grounding Validator. Generation itself
// has no dedicated pass/fail metric in the lite eval, so it's shown as a
// neutral, informational node rather than assigned an unearned tier color.
const PIPELINE: { label: string; detail: string; tier: Tier | null }[] = [
  { label: 'Retrieval', detail: `Recall@5 · ${recallPct}%`, tier: recallTier },
  { label: 'Evidence Gate', detail: `Refusal · ${refusalPct}%`, tier: refusalTier },
  { label: 'Generation', detail: 'Gemini Flash Lite', tier: null },
  { label: 'Citation Validation', detail: `Correctness · ${citationPct}%`, tier: citationTier },
  { label: 'Grounding Validator', detail: 'Entailment check', tier: hallucinationRateTier },
]

function MetricBar({ pct, tier }: { pct: number; tier: Tier }) {
  return (
    <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-border" role="presentation">
      <div className={`h-full rounded-full ${TIER_CLASS[tier].bar}`} style={{ width: `${Math.max(4, pct)}%` }} />
    </div>
  )
}

function TierTag({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${TIER_CLASS[tier].text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TIER_CLASS[tier].dot}`} aria-hidden="true" />
      {TIER_LABEL[tier]}
    </span>
  )
}

export function EvaluationPage() {
  const evalRun = useEvalRun()
  const evalAblation = useEvalAblation()
  const run = evalRun.data

  return (
    <AppShell>
      <PageShell
        title="Evaluation"
        description="Measure retrieval quality, grounding accuracy and citation reliability across the SpecGuard AI pipeline."
        breadcrumb="Insights  ›  Evaluation"
        kicker="Development Run"
      >
        {/* Barely-visible radial tint — page stays #F7F7F5, this is texture not color */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px]"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(8,127,106,0.028), transparent 45%)',
          }}
          aria-hidden="true"
        />

        {/* Development evaluation context — compact, full content width */}
        <div className="fade-in-up fade-in-up-1 mt-5 flex items-center gap-3 rounded-[14px] border border-warning/25 bg-warning-soft/60 px-5 py-3.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-warning" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 9v4M12 16.5h.01M10.6 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.4 3.9a1.8 1.8 0 0 0-2.8 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-[13px] leading-snug">
            <span className="font-semibold tracking-[0.01em] text-warning">Development Evaluation.</span>{' '}
            <span className="text-ink-muted">
              Results identify retrieval and grounding limitations. These results are not production benchmarks.
            </span>
          </p>
        </div>

        {/* Section label */}
        <div className="fade-in-up fade-in-up-2 mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Evaluation Overview</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">Latest development run</p>
        </div>

        {/* Partial-run warning — deliberately loud and impossible to skim
            past: full-width, solid (not tinted) background, directly above
            the metric-card grid it qualifies. Every card sourced from GET
            /api/v1/eval/run or /api/v1/eval/ablation carries its own
            "(n=...)" sample size and mutes its own number when n is low —
            this banner is the page-level version of that same warning. */}
        {run && run.partial && (
          <div className="fade-in-up mt-3 flex items-center gap-4 rounded-[14px] border-2 border-warning bg-warning px-6 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-white" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 16.5h.01M10.6 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.4 3.9a1.8 1.8 0 0 0-2.8 0Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="text-[14px] font-semibold leading-snug text-white">
              Partial evaluation — {run.scored_question_count} of {run.total_dataset_questions} questions scored.
              Metrics below are not statistically meaningful until the full run completes.
            </p>
          </div>
        )}

        {/* KPI row — semantic hierarchy, not five identical boxes */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {METRICS.map((m) => (
            <div
              key={m.key}
              className="card-interactive flex min-h-[134px] flex-col rounded-2xl border border-border bg-surface px-[18px] py-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${TIER_CLASS[m.tier].iconBg} ${TIER_CLASS[m.tier].iconText}`}
                >
                  {ICONS[m.icon]}
                </span>
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{m.label}</p>
              </div>

              <p className="font-display mt-3.5 text-[32px] font-semibold leading-none tracking-[-0.035em] text-ink">
                {m.pct}%
              </p>
              <div className="mt-2">
                <TierTag tier={m.tier} />
              </div>

              <MetricBar pct={m.pct} tier={m.tier} />
            </div>
          ))}

          {LIVE_METRIC_DEFS.map((m) => {
            const value = run?.[m.key] ?? null
            if (value === null) {
              const note = evalRun.isLoading
                ? 'Loading latest evaluation run…'
                : evalRun.isError
                  ? "Couldn't reach the evaluation endpoint."
                  : run
                    ? 'Not yet scored for the seeded questions.'
                    : 'Requires evaluation/seed_eval_queries.py to have been run.'
              return (
                <div
                  key={m.key}
                  className="flex min-h-[134px] flex-col justify-between rounded-2xl border border-dashed border-border-strong bg-surface-2/40 px-[18px] py-4"
                >
                  <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{m.label}</p>
                    <p className="mt-2 text-[12px] leading-snug text-ink-muted">{note}</p>
                  </div>
                  <span className="w-fit rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    Coming soon
                  </span>
                </div>
              )
            }

            const pct = Math.round(value * 100)
            const tier = (m.tierFn ?? higherIsBetterTier)(pct)
            const n = run?.[m.nKey] ?? 0
            return (
              <div
                key={m.key}
                className="card-interactive flex min-h-[134px] flex-col rounded-2xl border border-border bg-surface px-[18px] py-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${TIER_CLASS[tier].iconBg} ${TIER_CLASS[tier].iconText}`}
                  >
                    {ICONS[m.icon]}
                  </span>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{m.label}</p>
                </div>

                <div className="mt-3.5">
                  <MetricValue pct={pct} n={n} />
                </div>
                <div className="mt-2">
                  <TierTag tier={tier} />
                </div>

                <MetricBar pct={pct} tier={tier} />
              </div>
            )
          })}
        </div>

        {/* Evaluation pipeline — one continuous connected system, not four boxes */}
        <div className="card-shadow fade-in-up mt-6 rounded-2xl border border-border bg-surface px-7 py-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Evaluation Pipeline</p>

          <div className="mt-7 flex items-start gap-0 overflow-x-auto pb-1">
            {PIPELINE.map((node, i) => (
              <div key={node.label} className="flex flex-1 items-start last:flex-none">
                <div className="flex min-w-[104px] flex-col items-center text-center">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${node.tier ? TIER_CLASS[node.tier].dot : 'bg-border-strong'}`}
                    style={node.tier ? { boxShadow: `0 0 0 4px ${TIER_CLASS[node.tier].ringRgba}` } : undefined}
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-[13px] font-semibold text-ink">{node.label}</p>
                  <p className="mt-1 text-[12px] leading-tight text-ink-muted">{node.detail}</p>
                </div>
                {i < PIPELINE.length - 1 && <div className="mt-[5px] h-px flex-1 self-start bg-border" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>

        {/* Ablation Comparison (TRD §10) — reads evaluation/ablation_results.json
            via GET /api/v1/eval/ablation (written by evaluation/run_ablation.py).
            Renders real per-variant numbers once that's been run; otherwise
            an honest "not yet run" state rather than invented numbers. */}
        <div className="card-shadow fade-in-up mt-6 rounded-2xl border border-border bg-surface px-7 py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Ablation Comparison</p>
            <span className="rounded-full border border-border-strong bg-surface-2/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {evalAblation.data ? (evalAblation.data.partial ? 'Partial run' : 'Complete') : 'Not yet run'}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            Hallucination Rate, Faithfulness, and Recall@5 across three system variants.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="border-b border-divider pb-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    Metric
                  </th>
                  {(evalAblation.data?.variants ?? [
                    { variant_name: 'basic_rag' },
                    { variant_name: 'hybrid_rerank' },
                    { variant_name: 'full_system' },
                  ]).map((v) => (
                    <th
                      key={v.variant_name}
                      className="border-b border-divider pb-2.5 pl-6 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint"
                    >
                      {VARIANT_LABELS[v.variant_name] ?? v.variant_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: 'Hallucination Rate', key: 'hallucination_rate', nKey: 'answered_count' },
                    { label: 'Faithfulness', key: 'faithfulness', nKey: 'faithfulness_scored_count' },
                    { label: 'Recall@5', key: 'recall_at_5', nKey: 'recall_scored_count' },
                  ] as const
                ).map((row) => (
                  <tr key={row.label}>
                    <td className="border-b border-divider py-3 text-[13px] font-medium text-ink">{row.label}</td>
                    {evalAblation.data ? (
                      evalAblation.data.variants.map((v) => {
                        const value = v[row.key]
                        const n = v[row.nKey]
                        return (
                          <td key={v.variant_name} className="border-b border-divider py-3 pl-6 font-mono text-[13px]">
                            {value !== null ? (
                              <span className={n < FULL_DATASET_SIZE ? 'text-ink-faint' : 'text-ink'}>
                                {Math.round(value * 100)}%
                              </span>
                            ) : (
                              <span className="text-ink-faint">—</span>
                            )}{' '}
                            <span className="text-ink-faint">(n={n})</span>
                          </td>
                        )
                      })
                    ) : (
                      [0, 1, 2].map((col) => (
                        <td key={col} className="border-b border-divider py-3 pl-6 font-mono text-[13px] text-ink-faint">
                          —
                        </td>
                      ))
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
            {evalAblation.data
              ? `Scored ${evalAblation.data.question_count} question(s) per variant, ${evalAblation.data.timestamp.slice(0, 10)}.`
              : "Run `python evaluation/run_ablation.py` to populate this table — Basic RAG, +Hybrid Retrieval + Reranking, and Full System each require a separate live pass over the dataset."}
          </p>
        </div>

        {/* Findings (wide) + Run metadata (narrow) — side by side, not stacked */}
        <div className="fade-in-up mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="card-shadow rounded-2xl border border-border bg-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">What We Learned</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">Key observations from the latest evaluation.</p>

            <div className="mt-4 divide-y divide-divider">
              {FINDINGS.map((finding, i) => (
                <div
                  key={finding.title}
                  className="flex gap-3.5 rounded-lg py-[18px] transition-colors first:pt-0 last:pb-0 hover:bg-surface-2/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sage-soft font-mono text-[11px] font-semibold text-forest">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink">
                      {finding.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{finding.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported directly by finding 02 above — not a new claim. */}
            <div className="mt-2 flex items-start gap-3 rounded-xl border border-[#DDECE7] bg-[#F4F9F7] px-4 py-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sage-soft text-forest">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="m3 12 6 6L21 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-forest">Primary Bottleneck</p>
                <p className="mt-1 text-[13px] font-semibold text-ink">Retrieval quality</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                  Recall and ranking currently limit how often the correct clause reaches the generator.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E5E1] bg-surface-2/50 p-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage" aria-hidden="true" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-forest">Development Run</p>
            </div>
            <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Latest Evaluation Run
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className="font-mono text-[27px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {LITE_EVAL_SUMMARY.totalWallTimeSeconds}s
                </p>
                <p className="mt-1.5 text-[12px] text-ink-muted">Total runtime</p>
              </div>
              <div className="border-t border-divider pt-4">
                <p className="font-mono text-[27px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {LITE_EVAL_SUMMARY.questionCount}
                </p>
                <p className="mt-1.5 text-[12px] text-ink-muted">Questions</p>
              </div>
              <div className="border-t border-divider pt-4">
                <p className="font-mono text-[27px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {LITE_EVAL_SUMMARY.scoredQuestionCount}/{LITE_EVAL_SUMMARY.questionCount}
                </p>
                <p className="mt-1.5 text-[12px] text-ink-muted">Recall / MRR scored</p>
              </div>
            </div>
          </div>
        </div>

        {/* Production Benchmark — flat footer-like panel, no nested box */}
        <div className="fade-in-up mt-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-sage/20 bg-sage-soft/30 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-forest">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">Production Benchmark Suite</p>
              <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-ink-muted">
                Compare Basic RAG, reranking and grounding validation. A production benchmark will be available once
                the suite is ready for a larger evaluation set.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-forest">
            Coming soon
          </span>
        </div>
      </PageShell>
    </AppShell>
  )
}
