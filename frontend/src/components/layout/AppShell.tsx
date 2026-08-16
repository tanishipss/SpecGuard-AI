import { useState } from 'react'
import type { ReactNode } from 'react'
import { Sidebar, SidebarContent } from './Sidebar'
import { ProfileCompletionModal } from '../ProfileCompletionModal'

interface Props {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-ivory text-ink">
      <Sidebar />

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMenuOpen(false)} />
          <div className="glass-strong relative z-50 w-64 animate-[slideIn_200ms_ease-out] px-4 py-6">
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg border border-border p-1.5 text-ink-muted"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-ink">SpecGuard AI</span>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>

      <ProfileCompletionModal />
    </div>
  )
}
