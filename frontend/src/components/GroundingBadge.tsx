interface Props {
  grounded: boolean
  groundingVerdict: string | null
}

export function GroundingBadge({ grounded, groundingVerdict }: Props) {
  if (!grounded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.71 3.86a1.5 1.5 0 0 0-2.42 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Insufficient evidence
      </span>
    )
  }

  // A real "pass" verdict is the strongest trust signal on the page — sized
  // up and tinted rather than treated as a small utility label.
  const isStrongPass = groundingVerdict === 'pass'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-success-soft font-semibold text-success ${
        isStrongPass ? 'px-3.5 py-1.5 text-[13px]' : 'px-2.5 py-1 text-xs font-medium'
      }`}
    >
      <svg
        width={isStrongPass ? 14 : 12}
        height={isStrongPass ? 14 : 12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Grounded {groundingVerdict ? `(${groundingVerdict})` : ''}
    </span>
  )
}
