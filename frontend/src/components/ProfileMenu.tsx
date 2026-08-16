import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { initialsFrom } from '../lib/identity'

export function ProfileMenu({ compact = false }: { compact?: boolean }) {
  const { user, logout, updateProfile } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null

  const displayName = user.full_name ?? null
  const initials = initialsFrom(user.full_name)

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
    showToast('Signed out')
  }

  const startEditing = () => {
    setNameDraft(user.full_name ?? '')
    setError(null)
    setEditing(true)
  }

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim()
    if (trimmed.length < 2) {
      setError('Name is too short.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateProfile(trimmed)
      setEditing(false)
      showToast('Profile updated')
    } catch {
      setError('Could not save. Try again.')
      showToast('Could not save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-2.5 rounded-lg text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage ${
          compact ? 'w-full border-t border-border px-2 pb-1 pt-3.5' : 'px-2.5 py-1.5'
        }`}
      >
        <span
          className={`icon-tile flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-forest font-semibold text-white ${
            compact ? 'h-[30px] w-[30px] text-[11px]' : 'h-8 w-8 text-xs'
          }`}
        >
          {initials}
        </span>
        {!compact && <span className="text-sm font-medium text-ink">{displayName ?? 'Account'}</span>}
        {compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-ink">{displayName ?? 'Account'}</span>
            <span className="block truncate text-[11px] text-ink-faint">{user.email}</span>
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-ink-faint"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`glass-strong absolute z-50 w-64 rounded-xl py-1 [animation:fadeIn_150ms_ease-out] ${
            compact ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'
          }`}
        >
          {!editing && (
            <>
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-medium text-ink">{displayName ?? 'No name set'}</p>
                <p className="truncate text-xs text-ink-muted">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={startEditing}
                className="w-full px-3 py-2 text-left text-sm text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-b-2xl px-3 py-2 text-left text-sm text-error hover:bg-error-soft"
              >
                Logout
              </button>
            </>
          )}

          {editing && (
            <div className="px-3 py-3">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Full Name
              </label>
              <input
                type="text"
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                minLength={2}
                maxLength={100}
                className="w-full rounded-lg border border-border bg-ivory px-3 py-2 text-sm text-ink focus:border-sage focus:outline focus:outline-2 focus:outline-sage-soft"
              />
              {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
              <p className="mt-1.5 text-xs text-ink-muted">{user.email}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-sage hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-ivory hover:bg-forest-hover disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
