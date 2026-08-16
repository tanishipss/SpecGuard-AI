const SUGGESTIONS = ['What is the role of the AMF?', 'Explain PDU session establishment.', 'What is 5QI?']

interface Props {
  onSelect: (question: string) => void
  disabled: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {SUGGESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-full border border-[#E4E5E1] bg-surface px-3.5 py-2 text-[12.5px] text-ink-muted transition-[transform,background-color,border-color,color] duration-150 hover:-translate-y-px hover:border-[#C8E2DC] hover:bg-[#EAF4F1] hover:text-forest disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {question}
        </button>
      ))}
    </div>
  )
}
