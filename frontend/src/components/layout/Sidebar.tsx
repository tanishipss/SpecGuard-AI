import { NavLink } from 'react-router-dom'
import { ProfileMenu } from '../ProfileMenu'

function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="13" y="8" width="3" height="10" />
      <rect x="17" y="5" width="3" height="13" />
    </svg>
  )
}

function PipelineIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="5" cy="5" r="2.2" />
      <circle cx="19" cy="5" r="2.2" />
      <circle cx="12" cy="19" r="2.2" />
      <path d="M6.8 6.4L11 17.3M17.2 6.4L13 17.3M7.2 5h9.6" />
    </svg>
  )
}

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
      { to: '/assistant', label: 'Ask AI', Icon: ChatIcon },
      { to: '/documents', label: 'Knowledge Base', Icon: BookIcon },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/evaluation', label: 'Evaluation', Icon: ChartIcon },
      { to: '/how-it-works', label: 'How It Works', Icon: PipelineIcon },
    ],
  },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isPrimary = item.label === 'Ask AI'
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors duration-150 ${
                      isPrimary ? 'font-semibold' : 'font-medium'
                    } ${
                      isActive
                        ? 'bg-sage-soft text-forest [&>svg]:opacity-100'
                        : 'text-ink-muted [&>svg]:opacity-75 hover:bg-surface-2 hover:text-ink'
                    }`
                  }
                >
                  <item.Icon />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <NavLink to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-1 py-2">
        <span className="icon-tile flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sage to-forest text-base font-semibold text-white">
          ◈
        </span>
        <span className="font-display text-[14.5px] font-semibold text-ink">SpecGuard AI</span>
      </NavLink>

      <div className="mt-8 flex flex-1 flex-col">
        <NavLinks onNavigate={onNavigate} />
        <div className="sidebar-texture flex-1" aria-hidden="true" />
      </div>

      <div className="border-t border-border pt-4">
        <ProfileMenu compact />
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="glass-sidebar sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border px-4 py-6 lg:flex">
      <SidebarContent />
    </aside>
  )
}
