interface Props {
  grounded: boolean
  groundingVerdict: string | null
}

export function GroundingBadge({ grounded, groundingVerdict }: Props) {
  if (!grounded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-900/50 px-2.5 py-1 text-xs font-medium text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Refused
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/50 px-2.5 py-1 text-xs font-medium text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Grounded ({groundingVerdict ?? 'pass'})
    </span>
  )
}
