// Real, locally-persisted section bookmarks — same localStorage-based
// persistence the app already uses for the auth token (see api/client.ts).
// There's no backend endpoint for user bookmarks, so this is the existing
// frontend architecture's storage mechanism, not a new one.
const KEY = 'specguard_bookmarks'

export interface Bookmark {
  documentId: string
  chunkId: string
  section: string
  sectionTitle: string
  bookmarkedAt: number
}

function readAll(): Bookmark[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(bookmarks))
  } catch {
    // Storage unavailable — bookmarking silently becomes a no-op rather
    // than surfacing an error for a non-critical convenience feature.
  }
}

export function getBookmarksForDocument(documentId: string): Bookmark[] {
  return readAll().filter((b) => b.documentId === documentId)
}

export function isBookmarked(documentId: string, chunkId: string): boolean {
  return readAll().some((b) => b.documentId === documentId && b.chunkId === chunkId)
}

/** Toggles the bookmark and returns the new state (true = now bookmarked). */
export function toggleBookmark(bookmark: Omit<Bookmark, 'bookmarkedAt'>): boolean {
  const all = readAll()
  const exists = all.some((b) => b.documentId === bookmark.documentId && b.chunkId === bookmark.chunkId)
  if (exists) {
    writeAll(all.filter((b) => !(b.documentId === bookmark.documentId && b.chunkId === bookmark.chunkId)))
    return false
  }
  writeAll([...all, { ...bookmark, bookmarkedAt: Date.now() }])
  return true
}
