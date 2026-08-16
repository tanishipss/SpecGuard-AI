import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useDocument } from '../hooks/useDocument'
import { useDocuments } from '../hooks/useDocuments'
import { useDocumentSearch } from '../hooks/useDocumentSearch'
import { buildToc } from '../lib/toc'
import { isBookmarked, toggleBookmark } from '../lib/bookmarks'
import { recordDocumentView } from '../lib/recentlyViewed'
import { ApiError, type DocumentOut, type DocumentSearchResult } from '../api/types'

// 3GPP spec numbers look like "23.502" — optionally preceded by "TS". Used
// to recognize cross-references to *other* indexed specs within a
// document's real extracted text — never to invent one.
const SPEC_REF_RE = /\bTS\s*(\d{2}\.\d{3})\b|\b(\d{2}\.\d{3})\b/gi

// Wraps only the substrings of `text` that reference another spec already
// present in the Knowledge Base (per `resolvable`, keyed by spec_number).
// Everything else — including numbers that don't resolve to a real
// indexed document — passes through completely unchanged.
function linkifySpecReferences(text: string, resolvable: Map<string, DocumentOut>): ReactNode {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of text.matchAll(SPEC_REF_RE)) {
    const number = match[1] ?? match[2]
    const target = resolvable.get(number)
    if (!target || match.index === undefined) continue

    if (match.index > lastIndex) nodes.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>)
    nodes.push(
      <Link
        key={key++}
        to={`/documents/${target.id}`}
        title={`Open TS ${target.spec_number} — ${target.title}`}
        className="text-forest transition-colors duration-150 hover:text-forest-hover"
      >
        {match[0]}
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="ml-0.5 inline -translate-y-px opacity-60"
          aria-hidden="true"
        >
          <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex === 0) return text
  if (lastIndex < text.length) nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>)
  return nodes
}

// Small hover-revealed "copy link to this section" affordance — only ever
// rendered for a section's first (canonical) chunk, so the anchor id it
// copies is always unique and always resolvable.
function CopyLinkButton({ anchorId }: { anchorId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}${window.location.pathname}#${anchorId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silently no-op, not worth surfacing an error for.
    }
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link to this section"
        title="Copy link to this section"
        className="flex h-5 w-5 items-center justify-center rounded-md text-ink-faint opacity-0 transition-opacity duration-150 hover:bg-surface-2 hover:text-forest group-hover:opacity-100"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.43" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 0 0 7.07 7.07L13.5 18.57" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {copied && (
        <span className="absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-md">
          Link copied
        </span>
      )}
    </span>
  )
}

// Real, locally-persisted bookmark toggle (see lib/bookmarks.ts) — never a
// fake/decorative star. Visible state always reflects actual saved state.
function BookmarkButton({
  documentId,
  chunkId,
  section,
  sectionTitle,
}: {
  documentId: string
  chunkId: string
  section: string
  sectionTitle: string
}) {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(documentId, chunkId))
  const [confirmation, setConfirmation] = useState<string | null>(null)

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation()
    const nowBookmarked = toggleBookmark({ documentId, chunkId, section, sectionTitle })
    setBookmarked(nowBookmarked)
    setConfirmation(nowBookmarked ? 'Bookmarked' : 'Removed')
    setTimeout(() => setConfirmation(null), 1500)
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'Remove bookmark from this section' : 'Bookmark this section'}
        title={bookmarked ? 'Remove bookmark' : 'Bookmark this section'}
        className={`flex h-5 w-5 items-center justify-center rounded-md transition-colors duration-150 hover:bg-surface-2 ${
          bookmarked ? 'text-forest' : 'text-ink-faint hover:text-ink-muted'
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={bookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />
        </svg>
      </button>
      {confirmation && (
        <span className="absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white shadow-md">
          {confirmation}
        </span>
      )}
    </span>
  )
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

const isMacPlatform =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent)

function SpecSearch({
  documentId,
  onJump,
  onOpenPalette,
}: {
  documentId: string
  onJump: (chunkId: string) => void
  onOpenPalette: () => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const search = useDocumentSearch(documentId)
  const resultRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    search.mutate(trimmed, {
      onSuccess: () => {
        setOpen(true)
        setActiveIndex(-1)
      },
    })
  }

  const handleSelect = (result: DocumentSearchResult) => {
    onJump(result.chunk_id)
    setOpen(false)
    setActiveIndex(-1)
  }

  const results = search.data ?? []

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = i < results.length - 1 ? i + 1 : 0
        resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = i > 0 ? i - 1 : results.length - 1
        resultRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="flex h-[44px] items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-forest focus-within:shadow-[0_0_0_3px_rgba(8,127,106,0.07)]"
      >
        <span className="shrink-0 text-ink-faint">
          <SearchIcon />
        </span>
        <input
          id="spec-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => search.data && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search this specification"
          aria-label="Search this specification"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        {search.isPending && <span className="shrink-0 text-xs text-ink-faint">Searching…</span>}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          title="Command palette"
          className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint hover:border-sage hover:text-forest sm:flex"
        >
          {isMacPlatform ? '⌘' : 'Ctrl'} K
        </button>
      </form>

      {open && search.data && (
        <div
          className="glass-strong absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl p-2"
          onMouseLeave={() => setOpen(false)}
        >
          {search.data.length === 0 && (
            <p className="px-3 py-3 text-sm text-ink-muted">No matches in this specification.</p>
          )}
          {search.data.map((result, i) => (
            <button
              key={result.chunk_id}
              ref={(el) => {
                resultRefs.current[i] = el
              }}
              type="button"
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`block w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                i === activeIndex ? 'bg-sage-soft' : 'hover:bg-surface-2'
              }`}
            >
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-ink">§{result.section}</span>
                <span className="text-ink-muted">{result.section_title}</span>
                <span className="ml-auto shrink-0 text-xs text-ink-muted">p.{result.page_start}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{result.snippet}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface PaletteItem {
  id: string
  label: string
  sublabel?: string
  action: () => void
}

// Command palette — a filterable list over exactly the real, existing
// actions this page can already perform (search focus, navigation, TOC
// jump). No invented commands. Handles its own open/close transition so it
// can animate out instead of vanishing instantly on Escape/backdrop click.
function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: PaletteItem[]
}) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  useEffect(() => {
    if (open) {
      setMounted(true)
      setQuery('')
      setActiveIndex(0)
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), 150)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (visible) inputRef.current?.focus()
  }, [visible])

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.trim().toLowerCase()) ||
          item.sublabel?.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : items

  const activate = (item: PaletteItem) => {
    onClose()
    item.action()
  }

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = filtered.length === 0 ? 0 : (i + 1) % filtered.length
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => {
        const next = filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) activate(item)
    }
  }

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center bg-ink/20 pt-[15vh] backdrop-blur-[2px] transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className={`card-lg flex max-h-[60vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,opacity] duration-150 ${
          visible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-[0.98] opacity-0'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3.5">
          <span className="shrink-0 text-ink-faint">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            aria-label="Command palette input"
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <kbd className="shrink-0 rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
            Esc
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-[13px] text-ink-muted">No matching actions.</p>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              onClick={() => activate(item)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                i === activeIndex ? 'bg-sage-soft text-forest' : 'text-ink hover:bg-surface-2'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className={`block truncate text-[11.5px] ${i === activeIndex ? 'text-forest/70' : 'text-ink-muted'}`}>
                    {item.sublabel}
                  </span>
                )}
              </span>
              {i === activeIndex && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0" aria-hidden="true">
                  <path d="M9 10l-4 4 4 4M20 6v6a4 4 0 0 1-4 4H5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-divider px-4 py-2.5 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-strong bg-surface-2 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-strong bg-surface-2 px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border-strong bg-surface-2 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton — mirrors the real header/toolbar/TOC/article/AI-panel
// geometry exactly (same max-widths, same column widths, same heights) so
// the real content drops in with no layout shift, instead of a generic
// centered spinner over blank space.
function DocumentViewerSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="animate-pulse border-b border-[#E8E8E4] px-4 py-5 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="h-3 w-28 rounded bg-surface-2" />
          <div className="mt-3 h-[30px] w-48 rounded bg-surface-2" />
          <div className="mt-2.5 h-3.5 w-72 rounded bg-surface-2" />
          <div className="mt-3 h-3 w-64 rounded bg-surface-2" />
          <div className="mt-2.5 h-3 w-56 rounded bg-surface-2" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 py-6 sm:px-8">
        <aside className="hidden w-[230px] shrink-0 animate-pulse lg:block">
          <div className="h-2.5 w-16 rounded bg-surface-2" />
          <div className="mt-3.5 space-y-3">
            {[0, 12, 12, 0, 12, 12, 12].map((indent, i) => (
              <div
                key={i}
                style={{ marginLeft: indent, width: `${70 - indent}%` }}
                className="h-2.5 rounded bg-surface-2"
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 animate-pulse">
          <div className="mx-auto flex max-w-[760px] items-center gap-3">
            <div className="h-[44px] flex-1 rounded-xl bg-surface-2" />
            <div className="h-[44px] w-[92px] shrink-0 rounded-xl bg-surface-2" />
          </div>

          <div className="mx-auto mt-6 max-w-[760px] rounded-2xl border border-border bg-surface px-10 py-7">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`py-6 ${i > 0 ? 'border-t border-divider' : ''}`}>
                <div className="h-4 w-40 rounded bg-surface-2" />
                <div className="mt-2 h-2.5 w-20 rounded bg-surface-2" />
                <div className="mt-4 space-y-2.5">
                  <div className="h-3 w-full rounded bg-surface-2" />
                  <div className="h-3 w-full rounded bg-surface-2" />
                  <div className="h-3 w-2/3 rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="hidden w-[280px] shrink-0 animate-pulse lg:block">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="h-2.5 w-20 rounded bg-surface-2" />
            <div className="mt-4 h-3 w-32 rounded bg-surface-2" />
            <div className="mt-4 h-6 w-16 rounded bg-surface-2" />
            <div className="mt-1.5 h-2.5 w-24 rounded bg-surface-2" />
            <div className="mt-4 h-2.5 w-14 rounded bg-surface-2 border-t border-divider pt-3" />
            <div className="mt-4 h-[41px] w-full rounded-xl bg-surface-2" />
          </div>
        </aside>
      </div>
    </div>
  )
}

export function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const [searchParams] = useSearchParams()
  const highlightChunkId = searchParams.get('chunk')
  const navigate = useNavigate()

  const { data: doc, isLoading, isError, error, refetch, isRefetching } = useDocument(documentId)
  const { data: allDocuments } = useDocuments()
  const toc = useMemo(() => (doc ? buildToc(doc.sections) : []), [doc])

  const [mobilePanel, setMobilePanel] = useState<'toc' | 'info' | null>(null)
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null)
  const [highlightVisible, setHighlightVisible] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const chunkRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const tocItemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const hasScrolledToHighlight = useRef(false)
  const hasScrolledToSectionHash = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Global power-user shortcuts: Ctrl/Cmd+K toggles the command palette,
  // Escape closes whichever overlay (palette, then mobile TOC/info drawer)
  // is currently open — never both, and never something already closed.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
        return
      }
      if (e.key === 'Escape') {
        if (paletteOpen) setPaletteOpen(false)
        else if (mobilePanel) setMobilePanel(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paletteOpen, mobilePanel])

  useEffect(() => {
    if (!highlightChunkId || !doc || hasScrolledToHighlight.current) return
    const el = chunkRefs.current[highlightChunkId]
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' })
      hasScrolledToHighlight.current = true
    }
  }, [highlightChunkId, doc])

  // Evidence highlight is temporary — hold it fully visible for ~2s, then let
  // it fade (the app-wide `*` transition rule animates the background-color
  // change out over 180ms once this flips false).
  useEffect(() => {
    if (!highlightChunkId) {
      setHighlightVisible(false)
      return
    }
    setHighlightVisible(true)
    const timer = setTimeout(() => setHighlightVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [highlightChunkId])

  // Record this as a real view once the document has actually loaded — used
  // by the Knowledge Base's "Recently Viewed" list.
  useEffect(() => {
    if (!doc) return
    recordDocumentView({ id: doc.id, specNumber: doc.spec_number, title: doc.title })
  }, [doc])

  // A copied section link (#section-4-2-2) is a real anchor id, but it won't
  // exist in the DOM until the document has loaded, so the browser's native
  // same-load hash scroll can't reach it — do it ourselves, once, here.
  useEffect(() => {
    if (!doc || hasScrolledToSectionHash.current) return
    const hash = window.location.hash
    if (hash.startsWith('#section-')) {
      const el = document.getElementById(hash.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    hasScrolledToSectionHash.current = true
  }, [doc])

  // Real reading-progress tracking against the actual scroll container (the
  // AppShell content region — this page's root is its direct DOM child).
  useEffect(() => {
    const scrollEl = rootRef.current?.parentElement
    if (!scrollEl) return
    const updateProgress = () => {
      const max = scrollEl.scrollHeight - scrollEl.clientHeight
      setScrollProgress(max > 0 ? Math.min(1, Math.max(0, scrollEl.scrollTop / max)) : 0)
    }
    updateProgress()
    scrollEl.addEventListener('scroll', updateProgress, { passive: true })
    return () => scrollEl.removeEventListener('scroll', updateProgress)
  }, [doc])

  // Real scroll-position tracking (not simulated) — the TOC entry for
  // whichever section is nearest the top of the reading viewport is
  // highlighted as the user scrolls, one at a time.
  useEffect(() => {
    if (!doc) return
    const elementToChunk = new Map<Element, string>()
    Object.entries(chunkRefs.current).forEach(([chunkId, el]) => {
      if (el) elementToChunk.set(el, chunkId)
    })
    if (elementToChunk.size === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        const top = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b))
        const chunkId = elementToChunk.get(top.target)
        if (chunkId) setActiveChunkId(chunkId)
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    )
    elementToChunk.forEach((_, el) => observer.observe(el))
    return () => observer.disconnect()
  }, [doc])

  // Keep the active TOC entry visible within the TOC's own scroll box only —
  // `block: 'nearest'` combined with the container's `overflow-y-auto` means
  // this can never reach up and hijack the document's own scroll position.
  useEffect(() => {
    if (!activeChunkId) return
    tocItemRefs.current[activeChunkId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeChunkId])

  const scrollToChunk = (chunkId: string) => {
    chunkRefs.current[chunkId]?.scrollIntoView({ behavior: 'instant', block: 'start' })
    setMobilePanel(null)
  }

  // Palette contents are exactly the real actions this page already
  // performs — no invented commands, no fabricated data.
  const paletteItems: PaletteItem[] = [
    {
      id: 'search',
      label: 'Search this specification',
      action: () => document.getElementById('spec-search-input')?.focus(),
    },
    {
      id: 'ask',
      label: 'Ask SpecGuard AI',
      sublabel: 'Open the assistant',
      action: () => navigate('/assistant'),
    },
    {
      id: 'kb',
      label: 'Open Knowledge Base',
      action: () => navigate('/documents'),
    },
    ...toc.map((entry) => ({
      id: `section-${entry.chunkId}`,
      label: `Jump to §${entry.section} ${entry.sectionTitle}`,
      sublabel: 'Document section',
      action: () => scrollToChunk(entry.chunkId),
    })),
  ]

  if (isLoading) {
    return (
      <AppShell>
        <DocumentViewerSkeleton />
      </AppShell>
    )
  }

  if (isError || !doc) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center px-6">
          <div className="w-full max-w-[380px] text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft/70 text-forest">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 12v3.5M12 18.5h.01" strokeLinecap="round" />
              </svg>
            </span>

            <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {notFound ? 'Specification not found' : 'Unable to load specification'}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
              {notFound
                ? "This specification doesn't exist, or may have been removed from the index."
                : 'The specification could not be retrieved right now.'}
            </p>

            <div className="mt-5 flex flex-col gap-2.5">
              {!notFound && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="flex h-[40px] items-center justify-center rounded-xl bg-forest text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-forest-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRefetching ? 'Retrying…' : 'Try again'}
                </button>
              )}
              <Link
                to="/documents"
                className="flex h-[40px] items-center justify-center rounded-xl border border-border text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:border-sage hover:text-ink"
              >
                Back to Knowledge Base
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const tocPanel = (
    <nav aria-label="Table of contents" className="flex max-h-[calc(100vh-140px)] flex-col">
      <p className="mb-2.5 shrink-0 px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        Contents
      </p>
      <div className="space-y-0.5 overflow-y-auto pr-1">
        {toc.map((entry) => {
          const isActive = entry.chunkId === activeChunkId
          return (
            <div key={entry.section} className="relative">
              {isActive && (
                <span
                  className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-forest"
                  aria-hidden="true"
                />
              )}
              <button
                ref={(el) => {
                  tocItemRefs.current[entry.chunkId] = el
                }}
                type="button"
                onClick={() => scrollToChunk(entry.chunkId)}
                style={{ paddingLeft: `${8 + (entry.level - 1) * 12}px` }}
                className={`block w-full rounded-[7px] py-1.5 pr-2 text-left transition-colors duration-150 ${
                  entry.level <= 1 ? 'text-[12.5px] font-medium' : 'text-[11.5px]'
                } ${
                  isActive
                    ? 'bg-[#EAF4F1] text-forest'
                    : entry.level <= 1
                      ? 'text-[#30302D] hover:bg-[#F3F6F4]'
                      : 'text-[#7C7C77] hover:bg-[#F3F6F4]'
                }`}
              >
                <span className={isActive ? 'font-mono text-forest' : 'font-mono text-sage'}>{entry.section}</span>{' '}
                <span>{entry.sectionTitle}</span>
              </button>
            </div>
          )
        })}
      </div>
    </nav>
  )

  // Other real, already-indexed specs (never the current one) — the only
  // pool a cross-reference is allowed to resolve against.
  const otherDocs = (allDocuments ?? []).filter((d) => d.id !== doc.id)
  const resolvableByNumber = new Map(otherDocs.map((d) => [d.spec_number, d]))

  // "Related" means: another indexed spec whose number is actually named
  // somewhere in this document's real extracted text — not merely "also in
  // the Knowledge Base". No relationship is invented.
  const referencedNumbers = new Set<string>()
  for (const s of doc.sections) {
    for (const match of s.content.matchAll(SPEC_REF_RE)) {
      const number = match[1] ?? match[2]
      if (number) referencedNumbers.add(number)
    }
  }
  const relatedDocs = otherDocs.filter((d) => referencedNumbers.has(d.spec_number))

  // The section currently in view, per the same real IntersectionObserver
  // tracking that drives the TOC's active highlight — never guessed.
  const currentSectionEntry = toc.find((entry) => entry.chunkId === activeChunkId)

  const infoPanel = (
    <div className="card-shadow rounded-2xl border border-border bg-surface p-5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-forest">AI Context</p>

      {currentSectionEntry && (
        <div className="mt-3 rounded-xl bg-sage-soft/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-forest/80">Current Section</p>
          <p className="mt-1 text-[12.5px] font-medium leading-snug text-ink">
            <span className="font-mono text-forest">§{currentSectionEntry.section}</span>{' '}
            {currentSectionEntry.sectionTitle}
          </p>
          <button
            type="button"
            onClick={() =>
              navigate('/assistant', {
                state: {
                  prefillQuestion: `What does §${currentSectionEntry.section} ${currentSectionEntry.sectionTitle} cover?`,
                },
              })
            }
            className="mt-2 text-[11.5px] font-medium text-forest hover:underline"
          >
            Ask about this section →
          </button>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-success">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Indexed for AI retrieval
      </p>

      <p className="mt-4 font-display text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
        {doc.chunk_count.toLocaleString()}
      </p>
      <p className="mt-1 text-[11.5px] text-ink-muted">searchable chunks</p>

      <div className="mt-4 border-t border-divider pt-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Release</p>
        <p className="mt-0.5 text-[13px] font-medium text-ink">{doc.release}</p>
      </div>

      <p className="mt-4 border-t border-divider pt-3.5 text-[12px] leading-[1.6] text-ink-muted">
        Every section of this specification is embedded and indexed so SpecGuard AI can retrieve it as evidence
        when answering questions.
      </p>

      {relatedDocs.length > 0 && (
        <div className="mt-4 border-t border-divider pt-3.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">Related Specifications</p>
          <div className="mt-2 divide-y divide-divider">
            {relatedDocs.map((related) => (
              <Link
                key={related.id}
                to={`/documents/${related.id}`}
                className="group/related flex items-center justify-between gap-2 py-2 text-left transition-colors duration-150 first:pt-0 last:pb-0"
              >
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-ink group-hover/related:text-forest">
                    TS {related.spec_number}
                  </span>
                  <span className="block truncate text-[11px] text-ink-muted group-hover/related:text-forest/80">
                    {related.title}
                  </span>
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-ink-faint transition-colors duration-150 group-hover/related:text-forest"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Link
        to="/assistant"
        className="mt-4 flex h-[41px] items-center justify-center rounded-xl border border-[#DDE3E0] px-3 text-center text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-[#C9E1DB] hover:bg-[#EAF4F1] hover:text-forest"
      >
        Ask about this specification →
      </Link>
    </div>
  )

  // First chunk encountered per section number gets the stable, linkable
  // anchor id — later chunks of the same section stay id-less so no two
  // elements can ever collide on the same `#section-...` fragment.
  const firstChunkOfSection = new Map<string, string>()
  for (const s of doc.sections) {
    if (!firstChunkOfSection.has(s.section)) firstChunkOfSection.set(s.section, s.chunk_id)
  }

  return (
    <AppShell>
      <div ref={rootRef} className="flex flex-col">
        {/* Document header — an identity block, not a compressed title bar */}
        <div className="glass-sidebar sticky top-0 z-10 border-b border-[#E8E8E4] px-4 py-5 sm:px-8 relative">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
                <Link
                  to="/documents"
                  className="rounded-[6px] transition-colors duration-150 hover:text-forest"
                >
                  Knowledge Base
                </Link>
                <span aria-hidden="true">/</span>
                {/* No dedicated route per release yet — shown for hierarchy, not clickable. */}
                <span>3GPP Release {doc.release.replace(/^Rel-?/i, '')}</span>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="font-medium text-ink">
                  TS {doc.spec_number}
                </span>
              </nav>
              <h1 className="mt-2 font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">
                TS {doc.spec_number}
              </h1>
              <p className="mt-1.5 text-[14px] text-ink-muted">{doc.title}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[#777772]">
                <span className="flex items-center gap-1 font-medium text-forest">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Indexed
                </span>
                <span aria-hidden="true">·</span>
                <span>{doc.chunk_count.toLocaleString()} searchable chunks</span>
                <span aria-hidden="true">·</span>
                <span>{doc.release}</span>
              </div>
              <p className="mt-2 text-[12px] italic text-[#888883]">
                Used as a primary knowledge source for SpecGuard AI.
              </p>
            </div>

            <div className="flex gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobilePanel('info')}
                aria-label="Open document info"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-sage hover:text-ink"
              >
                Info
              </button>
            </div>
          </div>

          {/* Reading progress — actual scroll position, not decorative */}
          <div className="absolute inset-x-0 bottom-0 h-[2.5px] overflow-hidden bg-transparent" aria-hidden="true">
            <div
              className="h-full origin-left bg-forest transition-transform duration-150 ease-out"
              style={{ transform: `scaleX(${scrollProgress})` }}
            />
          </div>
        </div>

        {/* Three-column document workspace — one page-level scroll (the
            AppShell content region); side panels stay in view via sticky
            positioning rather than each owning a competing scrollbar */}
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-8 px-4 py-6 sm:px-8">
          <aside className="hidden w-[230px] shrink-0 self-start lg:sticky lg:top-[100px] lg:block">
            {tocPanel}
          </aside>

          <div className="min-w-0 flex-1">
            {/* Reader toolbar — not sticky (the document header above already
                occupies top:0 of this scroll container); pinned to the exact
                same max-width as the reading surface below it. */}
            <div className="mb-6">
              <div className="mx-auto flex max-w-[760px] items-center gap-3">
                <div className="min-w-0 flex-1">
                  <SpecSearch documentId={doc.id} onJump={scrollToChunk} onOpenPalette={() => setPaletteOpen(true)} />
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePanel('toc')}
                  className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-sage hover:text-ink lg:hidden"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
                  </svg>
                  Contents
                </button>
                <Link
                  to="/assistant"
                  className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:border-sage hover:text-forest"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
                  </svg>
                  Ask AI
                </Link>
              </div>
            </div>

            {/* Document reading surface — a distinct white "paper" against the ivory app background */}
            <article className="card-shadow mx-auto max-w-[760px] rounded-2xl border border-border bg-surface px-10 py-7 pb-16">
              {doc.sections.map((section, i) => {
                const isHighlighted = section.chunk_id === highlightChunkId && highlightVisible
                const isFirstInSection = firstChunkOfSection.get(section.section) === section.chunk_id
                const anchorId = isFirstInSection ? `section-${section.section.replace(/\./g, '-')}` : undefined
                return (
                  <div
                    key={section.chunk_id}
                    ref={(el) => {
                      chunkRefs.current[section.chunk_id] = el
                    }}
                    id={anchorId}
                    className={`scroll-mt-24 py-6 ${i > 0 ? 'border-t border-divider' : ''} ${
                      isHighlighted ? 'evidence-highlight -mx-4 rounded-xl px-4' : ''
                    }`}
                  >
                    {isHighlighted && (
                      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-ivory">
                        Evidence used for this answer
                      </p>
                    )}
                    <div className="group flex items-baseline gap-2">
                      <h2 className="font-mono text-[13px] font-semibold text-sage">§{section.section}</h2>
                      <h3 className="text-[19px] font-semibold leading-tight tracking-[-0.015em] text-ink">
                        {section.section_title}
                      </h3>
                      {anchorId && (
                        <>
                          <BookmarkButton
                            documentId={doc.id}
                            chunkId={section.chunk_id}
                            section={section.section}
                            sectionTitle={section.section_title}
                          />
                          <CopyLinkButton anchorId={anchorId} />
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-faint">
                      {section.page_start === section.page_end
                        ? `Page ${section.page_start}`
                        : `Pages ${section.page_start}–${section.page_end}`}
                    </p>
                    <div className="prose prose-sm mt-4 max-w-none text-[14px] text-[#242421] prose-p:my-3.5 prose-p:leading-[1.75]">
                      {section.content.split('\n\n').map((paragraph, pi) => (
                        <p key={pi}>{linkifySpecReferences(paragraph, resolvableByNumber)}</p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </article>
          </div>

          <aside className="hidden w-[280px] shrink-0 self-start lg:sticky lg:top-[100px] lg:block">
            {infoPanel}
          </aside>
        </div>
      </div>

      {mobilePanel && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/25 lg:hidden"
          onClick={() => setMobilePanel(null)}
        >
          <div
            className="glass-strong max-h-[70vh] w-full overflow-y-auto rounded-t-3xl p-5 [animation:drawerIn_220ms_cubic-bezier(0.4,0,0.2,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{mobilePanel === 'toc' ? 'Contents' : 'Document Info'}</p>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                aria-label="Close"
                className="rounded-full p-1 text-ink-muted hover:bg-surface-2"
              >
                ✕
              </button>
            </div>
            {mobilePanel === 'toc' ? tocPanel : infoPanel}
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </AppShell>
  )
}
