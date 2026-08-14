import ReactMarkdown from 'react-markdown'
import type { ChatResponse } from '../api/types'
import { GroundingBadge } from './GroundingBadge'
import { SourceList } from './SourceList'

interface Props {
  question: string
  response: ChatResponse
}

export function AnswerCard({ question, response }: Props) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="mb-3 text-sm font-medium text-slate-400">{question}</p>

      <div
        className={`rounded-lg p-4 ${
          response.grounded ? 'bg-slate-800/40' : 'border border-amber-900/60 bg-amber-950/20'
        }`}
      >
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5">
          <ReactMarkdown>{response.answer}</ReactMarkdown>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <GroundingBadge grounded={response.grounded} groundingVerdict={response.grounding_verdict} />
        <span className="text-xs text-slate-500">
          {response.retrieval.dense_candidates} dense · {response.retrieval.sparse_candidates} sparse →{' '}
          {response.retrieval.final_context} used · {response.latency_ms}ms
        </span>
      </div>

      <SourceList sources={response.sources} />
    </div>
  )
}
