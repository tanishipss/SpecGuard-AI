const STEPS = [
  'User Question',
  'Dense + Sparse Retrieval',
  'RRF Fusion',
  'Cross-Encoder Reranking',
  'Evidence Gate',
  'Gemini',
  'Grounding + Citations',
  'Answer / Safe Refusal',
]

export function PipelineDiagram() {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-stretch">
      {STEPS.map((step, i) => (
        <div key={step} className="flex flex-col items-center">
          <div className="w-full rounded-xl border border-border bg-surface px-5 py-3 text-center text-sm font-medium text-ink">
            {step}
          </div>
          {i < STEPS.length - 1 && <div className="h-8 w-px bg-border" />}
        </div>
      ))}
    </div>
  )
}
