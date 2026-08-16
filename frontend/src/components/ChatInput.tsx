import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onSubmit: (question: string) => void
  disabled: boolean
  initialValue?: string
}

export function ChatInput({ onSubmit, disabled, initialValue }: Props) {
  const [question, setQuestion] = useState(initialValue ?? '')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setQuestion('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-14 items-center gap-2.5 rounded-xl border border-[#DCDDD8] bg-[#FAFAF8] pl-2.5 pr-2.5 transition-[border-color,box-shadow] duration-150 focus-within:border-forest focus-within:shadow-[0_0_0_3px_rgba(8,127,106,0.08),0_8px_24px_rgba(8,127,106,0.06)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-forest" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question about Release 17 standards..."
        disabled={disabled}
        aria-label="Question"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        className="h-11 shrink-0 rounded-xl bg-[#9CCFC5] px-5 text-[14px] font-semibold text-[#164B42] transition-colors duration-150 hover:bg-forest hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#E8EEEC] disabled:text-[#9A9A96]"
      >
        {disabled ? 'Thinking…' : 'Ask →'}
      </button>
    </form>
  )
}
