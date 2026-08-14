import type { ChatSource } from '../api/types'

interface Props {
  sources: ChatSource[]
}

export function SourceList({ sources }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="mt-4 border-t border-slate-700 pt-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sources</h3>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.source_id} className="rounded-md bg-slate-800/60 p-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="rounded bg-sky-900/60 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                {source.source_id}
              </span>
              <span className="font-medium text-slate-200">
                TS {source.spec_number} ({source.release})
              </span>
              <span className="text-slate-400">
                §{source.section} · p.{source.page}
              </span>
            </div>
            <p className="mt-1.5 text-slate-400">{source.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
