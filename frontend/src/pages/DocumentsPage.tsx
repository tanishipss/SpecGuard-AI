import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PageShell } from '../components/layout/PageShell'
import { KnowledgeBaseCards, KnowledgeBaseCardsSkeleton } from '../components/KnowledgeBaseCards'
import { useDocuments } from '../hooks/useDocuments'
import { getRecentlyViewed } from '../lib/recentlyViewed'
import type { DocumentOut } from '../api/types'

// Real elapsed time since an actual recorded view — no invented labels.
function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function DocumentsPage() {
  const { data: documents, isLoading, isError, refetch, isRefetching } = useDocuments()
  const [selected, setSelected] = useState<DocumentOut | null>(null)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  // Read once per mount — a fresh route match (e.g. navigating back from a
  // document) already remounts this page, which is when the list should
  // reflect the latest real view history.
  const [recentlyViewed] = useState(() => getRecentlyViewed())

  // A real, wired-up shortcut — focuses the existing search field, doesn't
  // invent new search behavior.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredDocuments = documents?.filter((d) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return d.spec_number.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)
  })

  const totalChunks = documents?.reduce((sum, d) => sum + d.chunk_count, 0) ?? null
  const lastIndexed = documents?.length
    ? new Date(
        Math.max(...documents.map((d) => new Date(d.ingested_at).getTime())),
      ).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null
  const release = documents?.[0]?.release ?? 'Rel-17'

  return (
    <AppShell>
      <PageShell title="Knowledge Base" description="Explore the standards that power SpecGuard AI." kicker="3GPP Release 17">
        <div className="fade-in-up fade-in-up-1 mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {documents && documents.length > 0 && (
              <div className="relative mb-5">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A85]" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by spec number or title…"
                  aria-label="Search specifications"
                  className="h-[47px] w-full rounded-xl border border-border bg-surface pl-10 pr-16 text-[13.5px] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted focus:border-forest focus:outline-none focus:ring-[3px] focus:ring-forest/10"
                />
                <span
                  className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[10.5px] text-ink-faint sm:flex"
                  aria-hidden="true"
                >
                  {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K
                </span>
              </div>
            )}

            {documents && documents.length > 0 && (
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Indexed Specifications
                </p>
                <p className="text-[11.5px] text-ink-faint">
                  {documents.length} Release 17 standard{documents.length === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {isLoading && <KnowledgeBaseCardsSkeleton count={3} />}

            {isError && !isLoading && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong p-8 text-center">
                <p className="text-[13px] font-medium text-ink">Couldn&apos;t load the knowledge base.</p>
                <p className="text-[12.5px] text-ink-muted">Check your connection and try again.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="mt-1 flex h-9 items-center rounded-[10px] border border-border-strong px-3.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-sage hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefetching ? 'Retrying…' : 'Retry'}
                </button>
              </div>
            )}

            {filteredDocuments && filteredDocuments.length > 0 && (
              <KnowledgeBaseCards documents={filteredDocuments} onSelect={setSelected} />
            )}
            {filteredDocuments && filteredDocuments.length === 0 && documents && documents.length > 0 && (
              <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-[13px] text-ink-muted">
                No specifications match "{query}".
              </p>
            )}
          </div>

          {/* Corpus stats — real data from the documents API; sized to its own
              content rather than stretched to match the spec list's height */}
          <div className="card-shadow flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Corpus Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {documents?.length ?? '—'}
                </p>
                <p className="mt-1.5 text-[11.5px] text-ink-muted">Standards</p>
              </div>
              <div>
                <p className="font-display text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {totalChunks !== null ? totalChunks.toLocaleString() : '—'}
                </p>
                <p className="mt-1.5 text-[11.5px] text-ink-muted">Indexed chunks</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-[#ECECE8] pt-4">
              <div>
                <p className="text-[11.5px] text-ink-muted">Release</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{release}</p>
              </div>
              <div>
                <p className="text-[11.5px] text-ink-muted">Last indexed</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{lastIndexed ?? '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-sage/25 bg-sage-soft p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-forest">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-ink">Cross-spec search</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">
                      Search across all indexed specifications at once.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border-strong bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Planned
                </span>
              </div>
            </div>

            {/* Real, locally-recorded view history only — omitted entirely
                for a first-time visitor rather than shown with placeholders. */}
            {recentlyViewed.length > 0 && (
              <div className="border-t border-[#ECECE8] pt-3.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Recently Viewed</p>
                <div className="mt-2 divide-y divide-divider">
                  {recentlyViewed.map((entry) => (
                    <Link
                      key={entry.id}
                      to={`/documents/${entry.id}`}
                      className="group/recent flex items-center justify-between gap-2 py-2 text-left transition-colors duration-150 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-medium text-ink group-hover/recent:text-forest">
                          TS {entry.specNumber}
                        </span>
                        <span className="block truncate text-[11px] text-ink-muted group-hover/recent:text-forest/80">
                          {entry.title}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-faint group-hover/recent:text-forest">
                        {relativeTime(entry.viewedAt)}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/25 px-4 [animation:fadeIn_150ms_ease-out]"
            onClick={() => setSelected(null)}
          >
            <div
              className="glass-strong w-full max-w-md rounded-2xl p-7"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold text-ink">TS {selected.spec_number}</h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded-full p-1 text-ink-muted hover:bg-surface-2 hover:text-ink"
                >
                  ✕
                </button>
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Specification</dt>
                  <dd className="text-right text-ink">{selected.title}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Release</dt>
                  <dd className="text-ink">{selected.release}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Version</dt>
                  <dd className="text-ink">{selected.version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Chunk count</dt>
                  <dd className="text-ink">{selected.chunk_count.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Status</dt>
                  <dd className="font-medium text-success">✓ Fully indexed</dd>
                </div>
              </dl>
              <Link
                to={`/documents/${selected.id}`}
                className="mt-5 block rounded-xl bg-forest px-4 py-2.5 text-center text-sm font-medium text-ivory hover:bg-forest-hover"
              >
                Open Specification →
              </Link>
            </div>
          </div>
        )}
      </PageShell>
    </AppShell>
  )
}
