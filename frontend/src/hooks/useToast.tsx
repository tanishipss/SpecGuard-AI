import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  id: number
  message: string
  variant: 'success' | 'error'
}

interface ToastContextValue {
  showToast: (message: string, variant?: Toast['variant']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1.5 1.5 0 0 0 1.3 2.25h17.76a1.5 1.5 0 0 0 1.3-2.25L13.71 3.86a1.5 1.5 0 0 0-2.42 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Real, generic toast surface — used only for genuine events (profile save,
// login/logout, form/network errors), never simulated/decorative activity.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: Toast['variant'] = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="glass-strong pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-[13px] font-medium text-ink [animation:fadeInUp_200ms_ease-out_both]"
          >
            <span className={toast.variant === 'error' ? 'text-error' : 'text-success'}>
              {toast.variant === 'error' ? <ErrorIcon /> : <CheckIcon />}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
