import type { DocumentOut } from '../api/types'

// Short, human-readable descriptions of the (fixed, known) ingested specs —
// presentation polish over the same real backend title, not fabricated data.
const FRIENDLY_TITLES: Record<string, string> = {
  '23.501': 'System Architecture for the 5G System',
  '23.502': 'Procedures for the 5G System',
  '23.503': 'Policy and Charging Control Framework',
}

function formatIndexedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function KnowledgeBaseCards({
  documents,
  onSelect,
}: {
  documents: DocumentOut[]
  onSelect?: (doc: DocumentOut) => void
}) {
  const sorted = [...documents].sort((a, b) => a.spec_number.localeCompare(b.spec_number))
  const maxChunks = Math.max(1, ...documents.map((d) => d.chunk_count))

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => onSelect?.(doc)}
          className="card-interactive group flex min-h-[120px] w-full flex-col justify-between rounded-2xl border border-border bg-[#FBFCFB] px-4 py-4 text-left hover:border-[#D6E5E1]"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[10.5px] text-ink-faint">3GPP · {doc.release}</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-forest">
                <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" />
                </svg>
                Synced
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-ink">TS {doc.spec_number}</p>
              {onSelect && (
                <span className="text-[11px] font-medium text-forest opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  View specification →
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">
              {FRIENDLY_TITLES[doc.spec_number] ?? doc.title}
            </p>
          </div>

          <div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-divider pt-2">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                {doc.chunk_count.toLocaleString()} chunks
              </span>
              <span className="text-[11px] text-ink-faint">Indexed {formatIndexedDate(doc.ingested_at)}</span>
            </div>

            {/* Relative chunk-count proportion, real data (chunk_count / largest indexed spec) */}
            <div
              className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-[#E8ECE9]"
              role="img"
              aria-label={`${doc.chunk_count.toLocaleString()} chunks, ${Math.round((doc.chunk_count / maxChunks) * 100)}% of the largest indexed spec`}
            >
              <div
                className="h-full rounded-full bg-sage"
                style={{ width: `${Math.max(4, (doc.chunk_count / maxChunks) * 100)}%` }}
              />
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// Skeleton matching the real card's exact geometry (min-h, padding, radius)
// so the loading state doesn't cause a layout jump once data arrives.
export function KnowledgeBaseCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex min-h-[120px] w-full animate-pulse flex-col justify-between rounded-2xl border border-border bg-[#FBFCFB] px-4 py-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="h-3 w-20 rounded bg-surface-2" />
              <div className="h-3 w-14 rounded bg-surface-2" />
            </div>
            <div className="mt-2.5 h-3.5 w-24 rounded bg-surface-2" />
            <div className="mt-2 h-3 w-40 rounded bg-surface-2" />
          </div>
          <div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-divider pt-2">
              <div className="h-3 w-16 rounded bg-surface-2" />
              <div className="h-3 w-20 rounded bg-surface-2" />
            </div>
            <div className="mt-2 h-[3px] w-full rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}
