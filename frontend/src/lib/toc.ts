import type { DocumentSection } from '../api/types'

export interface TocEntry {
  section: string
  sectionTitle: string
  level: number
  chunkId: string
}

/** Real document structure, not invented: one entry per distinct clause
 * number, indented by clause depth (e.g. "6" -> level 1, "6.2" -> level 2,
 * "6.2.1" -> level 3). Sorted numerically by clause number rather than by
 * chunk/page order — front-matter (e.g. a "Contents" page) can be chunked
 * with real clause numbers that appear on early pages, which would
 * otherwise scramble a page-order listing. */
export function buildToc(sections: DocumentSection[]): TocEntry[] {
  const seen = new Set<string>()
  const entries: TocEntry[] = []

  for (const section of sections) {
    if (seen.has(section.section)) continue
    seen.add(section.section)
    entries.push({
      section: section.section,
      sectionTitle: section.section_title,
      level: section.section.split('.').length,
      chunkId: section.chunk_id,
    })
  }

  const clauseKey = (section: string) => section.split('.').map((part) => {
    const n = Number(part)
    return Number.isNaN(n) ? part : n.toString().padStart(6, '0')
  }).join('.')

  return entries.sort((a, b) => clauseKey(a.section).localeCompare(clauseKey(b.section)))
}
