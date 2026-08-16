import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/types'
import { AuthVisualPanel } from '../components/AuthVisualPanel'

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4 10 7-.6 1.4-1.8 3.3-3.5 4.7M6.3 6.9C4.5 8.2 3.1 10 2 12c1 3 5 7 10 7 1.1 0 2.1-.2 3-.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 10a3 3 0 0 0 4.2 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-ivory md:flex-row">
      {/* Extremely subtle atmospheric tint — texture, not a hero gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(circle at 78% 45%, rgba(8,127,106,0.035), transparent 55%)' }}
        aria-hidden="true"
      />

      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 md:w-[54%] md:min-w-[380px] md:shrink-0 md:px-10 lg:w-[44%] lg:min-w-[460px] lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-[400px]">
          <Link to="/" className="mb-12 flex items-center gap-2.5">
            <span className="icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-forest text-[18px] font-semibold text-ivory">
              ◈
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">SpecGuard AI</span>
              <span className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                Specification Intelligence
              </span>
            </span>
          </Link>

          <div className="card-shadow rounded-[18px] border border-border bg-surface p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Welcome back</p>
            <h1 className="mt-1.5 font-display text-[26px] font-semibold tracking-[-0.015em] text-ink">Sign in</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              Access your SpecGuard AI standards workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-[10px] border border-border bg-surface px-4 text-[14px] text-ink transition-[border-color,box-shadow] duration-150 focus:border-forest focus:outline-none focus:ring-[3px] focus:ring-forest/10"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="password" className="block text-[12.5px] font-medium text-ink-muted">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-[10px] border border-border bg-surface px-4 pr-12 text-[14px] text-ink transition-[border-color,box-shadow] duration-150 focus:border-forest focus:outline-none focus:ring-[3px] focus:ring-forest/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-faint transition-colors duration-150 hover:text-ink-muted focus-visible:text-forest"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-[13.5px] text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary-glow flex h-12 w-full items-center justify-center rounded-[10px] bg-forest text-[14px] font-semibold text-ivory transition-[background-color,transform,box-shadow] duration-150 hover:bg-forest-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="mr-2 h-[14px] w-[14px] animate-spin rounded-full border-2 border-ivory/40 border-t-ivory" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  'Sign in →'
                )}
              </button>
            </form>

            <p className="mt-6 text-[13.5px] text-ink-muted">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="font-medium text-forest hover:underline">
                Create one
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
            Secure enterprise workspace
          </p>
        </div>
      </div>

      <AuthVisualPanel />
    </div>
  )
}
