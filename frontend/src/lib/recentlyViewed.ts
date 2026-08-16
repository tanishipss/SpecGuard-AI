// Real, locally-persisted view history — nothing here is fabricated. Uses
// the same localStorage-based persistence the app already relies on for
// the auth token (see api/client.ts), since there's no backend endpoint
// for per-user view history.
const KEY = 'specguard_recent_docs'
const MAX_ENTRIES = 5

export interface RecentDocEntry {
  id: string
  specNumber: string
  title: string
  viewedAt: number
}

function readAll(): RecentDocEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Call once when a document has actually finished loading in the reader. */
export function recordDocumentView(entry: Omit<RecentDocEntry, 'viewedAt'>): void {
  try {
    const existing = readAll().filter((e) => e.id !== entry.id)
    const next = [{ ...entry, viewedAt: Date.now() }, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private browsing, quota) — view history is a
    // nice-to-have, not worth surfacing an error for.
  }
}

export function getRecentlyViewed(excludeId?: string): RecentDocEntry[] {
  return readAll().filter((e) => e.id !== excludeId)
}
