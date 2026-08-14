import { useDocuments } from '../hooks/useDocuments'

interface Props {
  value: string
  onChange: (release: string) => void
}

export function ReleaseSelector({ value, onChange }: Props) {
  const { data: documents } = useDocuments()
  const releases = Array.from(new Set(documents?.map((d) => d.release) ?? [])).sort()

  return (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      Release
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100 focus:border-sky-500 focus:outline-none"
      >
        <option value="">Any (default ingested release)</option>
        {releases.map((release) => (
          <option key={release} value={release}>
            {release}
          </option>
        ))}
      </select>
    </label>
  )
}
