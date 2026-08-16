interface Props {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div role="alert" className="card-shadow rounded-2xl border border-error/25 bg-surface p-5">
      <p className="text-[15px] font-semibold text-ink">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-forest hover:underline">
          Try again →
        </button>
      )}
    </div>
  )
}
