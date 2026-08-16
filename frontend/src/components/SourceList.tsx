import { Link } from 'react-router-dom'
import type { ChatSource } from '../api/types'

interface Props {
  sources: ChatSource[]
  onViewEvidence?: () => void
}

export function SourceList({ sources, onViewEvidence }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Sources</h3>
        {onViewEvidence && (
          <button type="button" onClick={onViewEvidence} className="text-xs font-medium text-forest hover:underline">
            View Evidence →
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.source_id} className="card-shadow rounded-xl border border-border bg-surface-2/60 p-3.5 text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <button
                type="button"
                onClick={onViewEvidence}
                disabled={!onViewEvidence}
                title="Open Evidence Explorer"
                className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-2.5 py-1 font-mono text-xs font-medium text-forest hover:bg-forest hover:text-white disabled:cursor-default disabled:hover:bg-sage-soft disabled:hover:text-forest"
              >
                TS {source.spec_number} · §{source.section} · p.{source.page}
              </button>
              <Link
                to={`/documents/${source.document_id}?chunk=${source.chunk_id}`}
                className="ml-auto text-xs font-medium text-forest hover:underline"
              >
                Open in Knowledge Base →
              </Link>
            </div>
            <p className="mt-2 text-ink-muted">{source.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
