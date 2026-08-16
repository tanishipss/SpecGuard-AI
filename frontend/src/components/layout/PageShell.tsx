import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Optional small muted trail above the title, e.g. "Dashboard / Research Console". */
  breadcrumb?: ReactNode
  /** Optional small mono/teal line above the title, e.g. "3GPP Release 17 · Active Session". */
  kicker?: ReactNode
}

// Single source of truth for page width/padding/header treatment across
// Dashboard, Knowledge Base, Assistant, Evaluation, and How It Works — so
// their headers sit at an identical position and their content shares one
// horizontal edge instead of each page inventing its own container.
export function PageShell({ title, description, actions, children, className = '', breadcrumb, kicker }: Props) {
  return (
    <div className={`relative mx-auto max-w-[1280px] px-6 py-8 sm:px-10 ${className}`}>
      <div className="fade-in-up flex flex-wrap items-center justify-between gap-6 border-b border-[#E9E9E5] pb-6">
        <div>
          {breadcrumb && <p className="mb-1.5 font-mono text-[11px] text-ink-faint">{breadcrumb}</p>}
          {kicker && (
            <p className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-forest">{kicker}</p>
          )}
          <h1 className="page-title text-ink">{title}</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-muted">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>

      {children}
    </div>
  )
}
