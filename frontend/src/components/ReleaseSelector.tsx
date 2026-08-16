import { useDocuments } from '../hooks/useDocuments'

interface Props {
  value: string
  onChange: (release: string) => void
}

export function ReleaseSelector({ value, onChange }: Props) {
  const { data: documents } = useDocuments()
  const releases = Array.from(new Set(documents?.map((d) => d.release) ?? [])).sort()

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="sr-only">Release</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Release"
        className="h-9 rounded-[10px] border border-border-strong bg-surface px-3 text-[12.5px] font-medium text-ink-muted focus:border-forest focus:outline focus:outline-2 focus:outline-sage-soft"
      >
        <option value="">Release 17</option>
        {releases.map((release) => (
          <option key={release} value={release}>
            {release}
          </option>
        ))}
      </select>
    </label>
  )
}
