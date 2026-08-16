import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

const TRACE_STEPS = [
  { label: 'Specification', detail: 'TS 23.501 · §6.2.1' },
  { label: 'Control', detail: 'AMF functionality' },
  { label: 'Assessment', detail: 'Grounded response' },
  { label: 'Evidence', detail: 'Verified source', active: true },
  { label: 'Decision', detail: 'Compliance outcome' },
]

// The same product story shown on login — signup's version stays within a
// centered, contained column (rather than login's edge-to-edge split panel)
// so the two-card composition reads as one deliberate shell.
function ProductPreview() {
  return (
    <div className="w-full max-w-[500px] md:max-w-[340px] lg:max-w-[500px]">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-forest">3GPP · Release 17</p>
      <h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink md:text-[28px] lg:text-[36px]">
        Every answer traces back to a real specification.
      </h2>
      <p className="mt-3 text-[13.5px] leading-[1.55] text-ink-muted">
        Ground compliance assessments in authoritative standards, controls, and evidence.
      </p>

      <div className="mt-8">
        {TRACE_STEPS.map((step, i) => (
          <div key={step.label} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                  step.active ? 'border-forest bg-forest text-white' : 'border-[#E3E4E1] bg-white text-ink-faint'
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {i < TRACE_STEPS.length - 1 && <span className="my-0.5 h-6 w-px flex-1 bg-[#D9DDD9]" aria-hidden="true" />}
            </div>
            <div className={`pb-4 ${i === TRACE_STEPS.length - 1 ? 'pb-0' : ''}`}>
              <p className={`text-[12px] font-semibold uppercase tracking-[0.05em] ${step.active ? 'text-forest' : 'text-ink'}`}>
                {step.label}
              </p>
              <p className="font-mono text-[12px] text-ink-muted">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="group mt-7 rounded-2xl border border-[#E4E6E2] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Retrieved Source</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="rounded bg-sage-soft px-1.5 py-0.5 font-mono text-[11px] text-forest">SRC-001</span>
          <span className="font-mono text-[13px] font-medium text-ink">TS 23.501</span>
          <span className="font-mono text-[12px] text-ink-muted">§6.2.1 · Page 415</span>
        </div>
        <mark className="evidence-highlight mt-3 block border-l-2 border-forest py-1 pl-3 text-[13.5px] leading-relaxed">
          The Access and Mobility Management function (AMF) includes the following functionality…
        </mark>
        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-success">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Grounded
        </div>
      </div>
    </div>
  )
}

const inputClass = (invalid: boolean) =>
  `h-12 w-full rounded-[10px] border bg-surface px-4 text-[14px] text-ink transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-[3px] ${
    invalid
      ? 'border-error focus:border-error focus:ring-error/10'
      : 'border-border focus:border-forest focus:ring-forest/10'
  }`

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedName = fullName.trim()
    let nextNameError: string | null = null
    let nextEmailError: string | null = null
    let nextPasswordError: string | null = null

    if (trimmedName.length < 2) {
      nextNameError = 'Please enter your full name.'
    } else if (trimmedName.length > 100) {
      nextNameError = 'That name is too long.'
    }

    if (!EMAIL_RE.test(email)) {
      nextEmailError = 'Please enter a valid email address.'
    }

    if (password.length < 8) {
      nextPasswordError = 'Password must be at least 8 characters.'
    }

    setNameError(nextNameError)
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)

    if (nextNameError || nextEmailError || nextPasswordError) return

    setSubmitting(true)
    try {
      await signup(trimmedName, email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Signup failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-ivory px-6 py-16 md:flex-row md:items-center md:justify-center md:px-10">
      {/* Extremely subtle atmospheric tint — texture, not a hero gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(circle at 78% 30%, rgba(8,127,106,0.03), transparent 55%)' }}
        aria-hidden="true"
      />

      {/* One centered authentication shell — signup is the dominant object,
          the product preview sits beside it as a secondary, de-emphasized
          companion rather than a competing full-height column. */}
      <div className="flex w-full max-w-[1200px] flex-col items-center gap-10 md:flex-row md:items-start md:justify-center md:gap-6 lg:gap-16 xl:gap-24">
        <div className="w-full max-w-[380px] md:max-w-[300px] lg:max-w-[380px]">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 md:justify-start">
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
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">Create Your Workspace</p>
            <h1 className="mt-1.5 font-display text-[28px] font-semibold tracking-[-0.015em] text-ink">Create your workspace</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
              Tell us how you&apos;d like to be addressed.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-[18px]" noValidate>
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={fullName}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? 'fullName-error' : undefined}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setNameError(null)
                  }}
                  placeholder="Tanisha Yadav"
                  className={inputClass(!!nameError)}
                />
                {nameError && (
                  <p id="fullName-error" role="alert" className="mt-1.5 text-[12px] text-error">
                    {nameError}
                  </p>
                )}
              </div>

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
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'email-error' : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  className={inputClass(!!emailError)}
                />
                {emailError && (
                  <p id="email-error" role="alert" className="mt-1.5 text-[12px] text-error">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    aria-invalid={passwordError ? true : undefined}
                    aria-describedby={passwordError ? 'password-error' : 'password-helper'}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setPasswordError(null)
                    }}
                    className={`${inputClass(!!passwordError)} pr-12`}
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
                {passwordError ? (
                  <p id="password-error" role="alert" className="mt-1.5 text-[12px] text-error">
                    {passwordError}
                  </p>
                ) : (
                  <p id="password-helper" className="mt-1.5 text-[12px] text-ink-faint">
                    At least 8 characters.
                  </p>
                )}
              </div>

              {formError && (
                <p role="alert" className="text-[13.5px] text-error">
                  {formError}
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
                    Creating workspace…
                  </>
                ) : (
                  'Create account →'
                )}
              </button>
            </form>

            <p className="mt-5 text-[13.5px] text-ink-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-forest hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-5 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-faint">
            Secure enterprise workspace
          </p>
        </div>

        <div className="border-t border-divider pt-8 md:border-t-0 md:pt-[52px]">
          <ProductPreview />
        </div>
      </div>
    </div>
  )
}
