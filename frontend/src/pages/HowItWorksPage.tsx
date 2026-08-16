import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { PageShell } from '../components/layout/PageShell'
import { ProfileMenu } from '../components/ProfileMenu'
import { ReleaseSelector } from '../components/ReleaseSelector'

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}
function TextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="6" cy="6" r="1.6" />
      <circle cx="18" cy="6" r="1.6" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="18" cy="18" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M6 6l6 6M18 6l-6 6M6 18l6-6M18 18l-6-6" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}
function FusionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 3v6a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v4M17 3v6a4 4 0 0 1-4 4h-2a4 4 0 0 0-4 4v4" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a3 3 0 0 0 3 3M17 5h3a3 3 0 0 1-3 3" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
    </svg>
  )
}
function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  )
}
function CheckShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.2 2.2L16 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border p-2 text-ink-muted hover:border-sage hover:text-ink ${open ? 'border-sage text-ink' : 'border-border'}`}
      >
        <BellIcon />
      </button>

      {open && (
        <div className="glass-strong absolute right-0 top-full z-30 mt-2 w-64 rounded-xl p-4 [animation:fadeIn_150ms_ease-out]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Notifications</p>
          <p className="mt-2 text-sm text-ink-muted">No new notifications.</p>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  { icon: DocIcon, title: '3GPP PDFs', description: 'Source specification PDFs are read and hashed for change detection.' },
  { icon: TextIcon, title: 'PyMuPDF', description: 'Text is extracted while preserving clause numbers and page ranges.' },
  { icon: GridIcon, title: 'Section-aware Chunks', description: 'Content is split along clause boundaries, never mid-sentence.' },
  { icon: DotsIcon, title: 'Embeddings', description: 'Each chunk is embedded into a dense vector representation.' },
  { icon: SearchIcon, title: 'Dense + Sparse Retrieval', description: 'A query is matched using both semantic and lexical search.' },
  { icon: FusionIcon, title: 'RRF Fusion', description: 'The two rankings are combined with Reciprocal Rank Fusion.' },
  { icon: TrophyIcon, title: 'Cross-Encoder Reranking', description: 'A cross-encoder jointly scores (query, chunk) pairs.' },
  { icon: ShieldIcon, title: 'Evidence Gate', description: 'Checks if the retrieved evidence is sufficient. If not, the model refuses to answer.' },
  { icon: SparkleIcon, title: 'Grounded Generation', description: 'Gemini generates the answer using only the approved evidence. Citations are attached.' },
]

const BENEFITS = [
  {
    icon: CheckShieldIcon,
    title: 'Grounded by Design',
    description: 'Answers are constrained by retrieved evidence.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Transparent & Verifiable',
    description: 'Every answer comes with source citations and evidence.',
  },
  {
    icon: LockIcon,
    title: 'Safe by Default',
    description: 'The system refuses when evidence is insufficient.',
  },
]

export function HowItWorksPage() {
  const [release, setRelease] = useState('')

  return (
    <AppShell>
      <PageShell
        kicker="3GPP · Release 17"
        title="How SpecGuard AI grounds answers"
        description="SpecGuard AI doesn't just return an answer. It shows the standards evidence behind it."
        actions={
          <>
            <ReleaseSelector value={release} onChange={setRelease} />
            <NotificationBell />
            <ProfileMenu />
          </>
        }
      >
        {/* Evidence pipeline — the five-stage architecture at a glance */}
        <div className="fade-in-up mt-10 flex flex-col items-stretch gap-0 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-start sm:gap-0 sm:p-7">
          {[
            { label: 'Question', detail: 'User asks about Release 17' },
            { label: 'Hybrid Retrieval', detail: 'Dense + sparse search' },
            { label: 'Precision Reranking', detail: 'Cross-encoder scoring' },
            { label: 'Evidence', detail: 'TS 23.501 · §6.2.1' },
            { label: 'Grounded Response', detail: 'Answer + citation', active: true },
          ].map((stage, i, arr) => (
            <div key={stage.label} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-0">
              <div className="flex items-center gap-3 sm:w-full">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold ${
                    stage.active ? 'border-forest bg-forest text-white' : 'border-border-strong bg-surface text-ink-faint'
                  }`}
                >
                  {i + 1}
                </span>
                {i < arr.length - 1 && (
                  <span className="hidden h-px flex-1 bg-border-strong sm:block" aria-hidden="true" />
                )}
              </div>
              <div className="pb-4 pl-3 text-left sm:pl-0 sm:pt-3">
                <p
                  className={`text-[12.5px] font-semibold uppercase tracking-[0.03em] ${stage.active ? 'text-forest' : 'text-ink'}`}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] text-ink-muted">{stage.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline grid — the detailed, technical breakdown of each stage */}
        <p className="mt-14 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Detailed Pipeline
        </p>
        <div className="fade-in-up fade-in-up-1 mt-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6">
            {STEPS.slice(0, 4).map((step, i) => (
              <div key={step.title} className="relative">
                <PipelineCard index={i + 1} step={step} />
                {i < 3 && <Connector />}
              </div>
            ))}
          </div>

          <div className="mx-auto my-2 hidden h-10 w-px border-l border-dashed border-sage/50 sm:block" />

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:mt-2 sm:grid-cols-5 sm:gap-x-6">
            {STEPS.slice(4).map((step, i) => (
              <div key={step.title} className="relative">
                <PipelineCard index={i + 5} step={step} />
                {i < 4 && <Connector />}
              </div>
            ))}
          </div>
        </div>

        {/* Benefits strip */}
        <div className="card-shadow mt-16 grid grid-cols-1 gap-5 rounded-2xl border border-border bg-surface p-8 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-forest">
                <b.icon />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    </AppShell>
  )
}

function PipelineCard({
  index,
  step,
}: {
  index: number
  step: { icon: ComponentType; title: string; description: string }
}) {
  return (
    <div className="card-shadow relative flex h-full flex-col rounded-2xl border border-border bg-surface p-5">
      <span className="absolute right-4 top-4 font-mono text-[11px] text-ink-muted">
        {String(index).padStart(2, '0')}
      </span>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-soft text-forest">
        <step.icon />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">{step.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.description}</p>
    </div>
  )
}

function Connector() {
  return (
    <div className="absolute right-[-18px] top-1/2 hidden -translate-y-1/2 text-sage/60 sm:block">
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path d="M0 8h18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M14 3l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
