import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

// Shown once for accounts created before `full_name` existed. Never derives
// a name from the email — asks the user directly instead.
export function ProfileCompletionModal() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!user || user.full_name) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Please enter your name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateProfile(trimmed)
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/25 px-4 [animation:fadeIn_150ms_ease-out]">
      <div className="glass-strong w-full max-w-sm rounded-3xl p-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Complete your profile</h2>
        <p className="mt-1.5 text-[15px] text-ink-muted">How should we address you?</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <label htmlFor="completeName" className="mb-1.5 block text-[13px] font-medium text-ink-muted">
              Full Name
            </label>
            <input
              id="completeName"
              type="text"
              autoFocus
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-[15px] text-ink focus:border-sage focus:outline focus:outline-2 focus:outline-sage-soft"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-forest px-4 py-2.5 text-[15px] font-medium text-ivory hover:bg-forest-hover disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
