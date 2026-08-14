interface Props {
  message: string
}

export function ErrorBanner({ message }: Props) {
  return (
    <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{message}</div>
  )
}
