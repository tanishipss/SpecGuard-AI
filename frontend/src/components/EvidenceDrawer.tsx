import { Link } from 'react-router-dom'
import type { ChatSource } from '../api/types'

interface Props {
  question: string
  sources: ChatSource[]
  onClose: () => void
}

const TRAIL = ['Question', 'Retrieved', 'Reranked', 'Grounded']

export function EvidenceDrawer({ question, sources, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/20 backdrop-blur-[2px] [animation:fadeIn_150ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="card-lg flex h-full w-full flex-col border-l bg-surface sm:max-w-[440px] [animation:drawerIn_260ms_cubic-bezier(0.4,0,0.2,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Evidence Explorer</h2>
              <p className="mt-0.5 text-sm text-ink-muted">Evidence used for this answer</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close evidence panel"
              className="rounded-full p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* Evidence trail */}
          <div className="mt-4 flex items-center gap-1.5">
            {TRAIL.map((step, i) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-xs font-medium text-forest">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {step}
                </span>
                {i < TRAIL.length - 1 && <span className="h-px w-4 bg-sage/50" />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Query</p>
          <p className="mt-1.5 text-sm text-ink">{question}</p>

          <p className="mt-7 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Retrieved Sources ({sources.length})
          </p>
          <div className="mt-3 divide-y divide-border">
            {sources.length === 0 && <p className="py-4 text-sm text-ink-muted">No evidence sources available.</p>}
            {sources.map((source) => (
              <div key={source.source_id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="rounded bg-sage-soft px-1.5 py-0.5 font-mono text-xs text-forest">
                    {source.source_id}
                  </span>
                  <span className="font-medium text-ink">TS {source.spec_number}</span>
                  <span className="text-ink-muted">
                    §{source.section} · Page {source.page}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Supporting Evidence
                </p>
                <mark className="evidence-highlight mt-1.5 block text-sm leading-relaxed">{source.snippet}</mark>
                <Link
                  to={`/documents/${source.document_id}?chunk=${source.chunk_id}`}
                  className="mt-2.5 inline-block text-xs font-medium text-forest hover:underline"
                >
                  Open in Knowledge Base →
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 px-6 py-4 text-xs text-ink-muted">
          This is the evidence supplied to the generator when producing this answer.
        </div>
      </div>
    </div>
  )
}
