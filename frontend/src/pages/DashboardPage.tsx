import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PageShell } from '../components/layout/PageShell'
import { KnowledgeBaseCards } from '../components/KnowledgeBaseCards'
import { ProfileMenu } from '../components/ProfileMenu'
import { ReleaseSelector } from '../components/ReleaseSelector'
import { useAuth } from '../hooks/useAuth'
import { useDocuments } from '../hooks/useDocuments'
import { firstNameOf, greetingWord } from '../lib/identity'
import { LITE_EVAL_SUMMARY } from '../data/evaluation'

// One representative suggested question per indexed spec — grouped so the
// "Suggested" row shows which document each answer is expected to come from.
const SUGGESTED_BY_SPEC = [
  { spec: '23.501', question: 'What is the role of the AMF?' },
  { spec: '23.502', question: 'Explain PDU session establishment.' },
  { spec: '23.503', question: 'What is 5QI?' },
]

const PLACEHOLDER_EXAMPLES = [
  'Ask about AMF, SMF, QoS flows, N2/N3 interfaces…',
  'What is the role of the UPF?',
  'Explain PDU session establishment.',
  'What is 5QI and how is it used?',
]

const PIPELINE_STEPS = [
  {
    label: '3GPP Spec PDFs',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    ),
  },
  {
    label: 'Section-aware Chunking',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Dense + Sparse Retrieval',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'RRF Fusion & Reranking',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3v6a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v4M17 3v6a4 4 0 0 1-4 4h-2a4 4 0 0 0-4 4v4" />
      </svg>
    ),
  },
  {
    label: 'Grounded Answer + Citations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      </svg>
    ),
  },
]

function CoverageRing({ percent }: { percent: number }) {
  const radius = 13
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      className="progress-ring"
      style={{ '--ring-circumference': circumference, '--ring-percent': percent / 100 } as React.CSSProperties}
      role="img"
      aria-label={`${percent}% index coverage`}
    >
      <circle cx="16" cy="16" r={radius} fill="none" stroke="var(--color-sage-soft)" strokeWidth="3.5" />
      <circle
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke="var(--color-sage)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DashboardPage() {
  const { data: documents, isLoading } = useDocuments()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [release, setRelease] = useState('')
  const [question, setQuestion] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length), 4000)
    return () => clearInterval(id)
  }, [])

  const totalChunks = documents?.reduce((sum, d) => sum + d.chunk_count, 0) ?? null
  const firstName = firstNameOf(user?.full_name)
  const greeting = `${greetingWord(new Date().getHours())}${firstName ? `, ${firstName}` : ''} 👋`

  // Real average latency, derived from the already-run evaluation harness
  // (evaluation/lite_results.json) — not live per-query telemetry, so it's
  // captioned honestly rather than implied to be production monitoring.
  const avgLatencySeconds = LITE_EVAL_SUMMARY.totalWallTimeSeconds / LITE_EVAL_SUMMARY.questionCount
  const latencyTone = avgLatencySeconds < 5 ? 'text-sage' : avgLatencySeconds <= 10 ? 'text-warning' : 'text-error'

  const goAsk = (q?: string) => {
    navigate('/assistant', q ? { state: { prefillQuestion: q } } : undefined)
  }

  const handleAskSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (question.trim()) goAsk(question.trim())
  }

  return (
    <AppShell>
      <PageShell
        title={greeting}
        description="Welcome back to your 3GPP knowledge workspace."
        breadcrumb="Dashboard  ›  Research Console"
        kicker="3GPP Release 17 · Active Session"
        actions={
          <>
            <button
              type="button"
              onClick={() =>
                document.getElementById('recent-questions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="flex h-9 items-center rounded-[10px] border border-border-strong px-3.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-sage hover:text-ink"
            >
              History
            </button>
            <Link
              to="/assistant"
              className="btn-primary-glow flex h-9 items-center rounded-[10px] bg-forest px-3.5 text-[12.5px] font-semibold text-white hover:bg-forest-hover"
            >
              + New Query
            </Link>
            <ReleaseSelector value={release} onChange={setRelease} />
            <ProfileMenu />
          </>
        }
      >
        {/* Knowledge Health — one dominant metric with supporting metrics in
            smaller type, typographic hierarchy rather than 4 equal boxes */}
        <div className="fade-in-up fade-in-up-1 mt-5 rounded-2xl border border-border bg-surface px-7 py-5 card-shadow">
          {isLoading ? (
            <div className="flex animate-pulse items-center gap-10">
              <div>
                <div className="h-3 w-28 rounded bg-surface-2" />
                <div className="mt-3 h-9 w-32 rounded bg-surface-2" />
              </div>
              <div className="h-9 flex-1 rounded bg-surface-2" />
            </div>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Knowledge Health</p>
                <p className="mt-1.5 font-display text-[36px] font-semibold leading-none tracking-[-0.04em] text-ink">
                  {totalChunks !== null ? totalChunks.toLocaleString() : '—'}
                </p>
                <p className="mt-1.5 text-[13px] text-ink-muted">indexed chunks across Release 17</p>
              </div>

              <div className="flex flex-wrap items-center gap-y-4 sm:justify-end">
                <div className="pr-6">
                  <p className="font-display text-lg font-semibold text-ink">{documents ? documents.length : '3'}</p>
                  <p className="text-[11.5px] text-ink-muted">Standards</p>
                </div>

                <div className="flex items-center gap-2.5 border-l border-divider pl-6 pr-6">
                  <CoverageRing percent={100} />
                  <div>
                    <p className="font-display text-lg font-semibold text-sage">100%</p>
                    <p className="text-[11.5px] text-ink-muted">Coverage</p>
                  </div>
                </div>

                <Link to="/evaluation" className="group border-l border-divider pl-6">
                  <p className={`font-display text-lg font-semibold group-hover:underline ${latencyTone}`}>
                    {avgLatencySeconds.toFixed(1)}s
                  </p>
                  <p className="text-[11.5px] text-ink-muted">Avg latency →</p>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Primary grid: Ask SpecGuard (dominant) + Knowledge base — stretched
            to a shared visual baseline so neither column trails off alone */}
        <div className="fade-in-up fade-in-up-2 relative mt-5 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.55fr_0.95fr]">
          <div
            className="pointer-events-none absolute -inset-x-4 -top-4 -z-10 h-[420px]"
            style={{ background: 'radial-gradient(circle at 15% 0%, rgba(8,127,106,0.03), transparent 55%)' }}
            aria-hidden="true"
          />

          {/* Ask SpecGuard AI — the page's one Hero element */}
          {isLoading ? (
            <div className="card-hero animate-pulse rounded-2xl border border-border bg-surface p-7">
              <div className="h-3 w-24 rounded bg-surface-2" />
              <div className="mt-4 h-6 w-48 rounded bg-surface-2" />
              <div className="mt-3 h-3 w-64 rounded bg-surface-2" />
              <div className="mt-6 h-12 w-full rounded-lg bg-surface-2" />
            </div>
          ) : (
            <div className="card-hero flex flex-col rounded-2xl border border-border bg-surface p-7">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-forest">3GPP Release 17</p>
              <h2 className="mt-2 font-display text-[23px] font-semibold tracking-[-0.02em] text-ink">
                Ask SpecGuard AI
              </h2>
              <p className="mt-1.5 max-w-md text-[13.5px] text-ink-muted">
                Search across your indexed 3GPP Release 17 standards.
              </p>

              <form
                onSubmit={handleAskSubmit}
                className="mt-5 flex h-[48px] items-stretch overflow-hidden rounded-xl border border-border-strong bg-surface-2/60 transition-[border-color,box-shadow] focus-within:border-forest focus-within:shadow-[0_0_0_3px_rgba(8,127,106,0.08)]"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
                  className="min-w-0 flex-1 bg-transparent px-4 text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="shrink-0 bg-forest px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-forest-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ask →
                </button>
              </form>

              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest" aria-hidden="true">
                  <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Answers grounded in indexed 3GPP specs with inline citations
              </p>

              <div className="mt-6 border-t border-divider pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Suggested Questions</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {SUGGESTED_BY_SPEC.map(({ spec, question: q }) => (
                    <div key={spec}>
                      <p className="mb-1 text-[10px] text-ink-faint">From TS {spec}</p>
                      <button
                        type="button"
                        onClick={() => goAsk(q)}
                        className="rounded-full border border-border-strong bg-[#FAFAF8] px-3.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-[#C8E2DC] hover:bg-[#EAF4F1] hover:text-forest"
                      >
                        {q}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Connected Specifications */}
          <div className="card-shadow flex flex-col rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Connected Specifications
            </h3>
            <p className="mt-1 text-xs text-ink-muted">Indexed 3GPP Release 17 specifications</p>
            <div className="mt-3.5 flex-1">
              {isLoading ? (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-2" />
                  ))}
                </div>
              ) : documents && documents.length > 0 ? (
                <KnowledgeBaseCards documents={documents} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong p-6 text-center">
                  <p className="text-[13px] font-medium text-ink-muted">No specifications indexed yet.</p>
                  <p className="text-[11.5px] text-ink-faint">
                    See README.md for how to ingest a spec PDF (file path + <span className="font-mono">curl</span>{' '}
                    — there's no one-click ingest UI yet).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Retrieval pipeline — the real, static architecture, not per-query telemetry */}
        <div className="card-shadow mt-5 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Retrieval Pipeline</h3>
          <p className="mt-1 text-xs text-ink-muted">How every question is answered, end to end.</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5">
            {PIPELINE_STEPS.map((step, i) => {
              const isFinal = i === PIPELINE_STEPS.length - 1
              return (
                <div key={step.label} className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-0">
                  <div
                    className={`flex w-full items-center gap-2.5 rounded-lg border p-3 sm:flex-col sm:items-start sm:gap-2 ${
                      isFinal ? 'border-sage bg-sage-soft/40' : 'border-border bg-surface-2'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-forest">
                      {step.icon}
                    </span>
                    <p className="text-[12.5px] font-medium text-ink">{step.label}</p>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="h-px w-3 shrink-0 bg-border sm:my-2 sm:h-2 sm:w-px sm:self-center" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity — honest fallback, no per-user history is stored.
            Target of the header's History control (scroll-to, not a fake link). */}
        <div id="recent-questions" className="card-shadow mt-5 scroll-mt-6 rounded-2xl border border-border bg-surface p-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Recent Questions</h3>
          <div className="mt-4 flex flex-col items-center gap-2 rounded-lg bg-surface-2 p-9 text-center text-[13px] text-ink-faint shadow-[inset_0_1px_3px_rgba(20,24,31,0.04)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Your recent questions will appear here.
          </div>
        </div>
      </PageShell>
    </AppShell>
  )
}
