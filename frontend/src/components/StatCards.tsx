interface Stat {
  value: string
  label: string
}

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-border bg-surface p-6 text-center sm:text-left">
          <p className="text-[28px] font-semibold tracking-tight text-ink">{stat.value}</p>
          <p className="mt-1 text-[13px] text-ink-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
