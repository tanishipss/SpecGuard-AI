import { Children, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import type { ChatResponse, ChatSource } from '../api/types'
import { GroundingBadge } from './GroundingBadge'
import { SourceList } from './SourceList'
import { useAuth } from '../hooks/useAuth'
import { initialsFrom } from '../lib/identity'

interface Props {
  question: string
  response: ChatResponse
  onViewEvidence?: () => void
  onRegenerate?: () => void
  regenerating?: boolean
}

const CITATION_RE = /\[(SRC-\d+)\]/g

function CitationChip({
  sourceId,
  source,
  occurrence,
}: {
  sourceId: string
  source: ChatSource | undefined
  occurrence: number
}) {
  const label = sourceId.replace(/^SRC-0*/, '') || sourceId
  // After the 2nd repeat of the same source in one answer, fade it back so
  // the eye isn't dragged to the same citation over and over.
  const faded = occurrence > 2

  const title = source
    ? `TS ${source.spec_number}, Section ${source.section} — ${source.snippet.slice(0, 110).trim()}${
        source.snippet.length > 110 ? '…' : ''
      }`
    : sourceId

  const sizeClass = faded ? 'h-4 min-w-4 px-1 text-[9px] opacity-60' : 'h-[18px] min-w-[18px] px-1.5 text-[10px]'

  // Only real, resolvable citations (matching an actual source in this
  // response) become links — an unresolved marker stays plain text rather
  // than pointing somewhere invented.
  if (!source) {
    return (
      <span
        title={title}
        aria-label={`Citation ${sourceId}`}
        className={`mx-0.5 inline-flex items-center justify-center rounded-full bg-ink-faint/50 align-middle font-mono font-semibold text-white ${sizeClass}`}
      >
        {label}
      </span>
    )
  }

  return (
    <Link
      to={`/documents/${source.document_id}?chunk=${source.chunk_id}`}
      title={title}
      aria-label={`Citation ${sourceId}, TS ${source.spec_number} section ${source.section} — open in document`}
      className={`mx-0.5 inline-flex items-center justify-center rounded-full bg-forest align-middle font-mono font-semibold text-white hover:bg-forest-hover ${sizeClass}`}
    >
      {label}
    </Link>
  )
}

// react-markdown parses the raw answer into elements before we ever see it,
// so citation markers ("[SRC-005]") have to be linkified per rendered text
// node (via a `p`/`li` component override) rather than via a naive string
// replace on the raw markdown, which would also mangle bold/list syntax.
function withCitations(children: ReactNode, sources: ChatSource[], counts: Record<string, number>): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string') return child
    const parts = child.split(CITATION_RE)
    return parts.map((part, i) => {
      if (i % 2 !== 1) return part
      counts[part] = (counts[part] ?? 0) + 1
      const source = sources.find((s) => s.source_id === part)
      return <CitationChip key={i} sourceId={part} source={source} occurrence={counts[part]} />
    })
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silently no-op, not worth surfacing an error for.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M4 16V5a2 2 0 0 1 2-2h11" />
      </svg>
      {copied ? 'Copied' : 'Copy answer'}
    </button>
  )
}

function ActionRow({
  answerText,
  onViewEvidence,
  onRegenerate,
  regenerating,
}: {
  answerText: string
  onViewEvidence?: () => void
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-border pt-2">
      <CopyButton text={answerText} />
      {onViewEvidence && (
        <button
          type="button"
          onClick={onViewEvidence}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          View source chunks
        </button>
      )}
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {regenerating ? 'Regenerating…' : 'Regenerate'}
        </button>
      )}
    </div>
  )
}

function SourcesSummary({ sources }: { sources: ChatSource[] }) {
  if (sources.length === 0) return null

  const bySpec = new Map<string, { count: number; documentId: string }>()
  for (const s of sources) {
    const entry = bySpec.get(s.spec_number)
    if (entry) entry.count += 1
    else bySpec.set(s.spec_number, { count: 1, documentId: s.document_id })
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs text-ink-muted">
        Sources referenced:{' '}
        {Array.from(bySpec.entries()).map(([spec, { count, documentId }], i, arr) => (
          <span key={spec}>
            <Link to={`/documents/${documentId}`} className="font-medium text-forest hover:underline">
              TS {spec}
            </Link>{' '}
            ({count}){i < arr.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
    </div>
  )
}

function UserBubble({ question }: { question: string }) {
  const { user } = useAuth()
  const initials = initialsFrom(user?.full_name)

  return (
    <div className="flex items-start justify-end gap-2">
      <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-sage-soft px-4 py-2.5 text-[15px] font-medium text-ink">
        {question}
      </p>
      <span className="icon-tile flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-forest text-[10px] font-semibold text-white">
        {initials}
      </span>
    </div>
  )
}

function AiAvatar() {
  return (
    <span className="icon-tile flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-white">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
      </svg>
    </span>
  )
}

export function AnswerCard({ question, response, onViewEvidence, onRegenerate, regenerating }: Props) {
  const citationCounts: Record<string, number> = {}

  if (!response.grounded) {
    return (
      <div className="fade-in-up space-y-3">
        <UserBubble question={question} />

        <div className="flex items-start gap-2">
          <AiAvatar />
          <div className="card-shadow flex-1 rounded-2xl border border-warning/25 bg-warning-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">SpecGuard AI</p>
              <GroundingBadge grounded={false} groundingVerdict={null} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink">{response.answer}</p>
            <p className="mt-2.5 text-xs text-ink-muted">
              Try asking about AMF, SMF, UPF, PDU sessions, QoS or other indexed 3GPP topics.
            </p>
            <ActionRow answerText={response.answer} onRegenerate={onRegenerate} regenerating={regenerating} />
          </div>
        </div>

        <p className="pl-9 text-xs text-ink-muted">
          {response.retrieval.dense_candidates} dense · {response.retrieval.sparse_candidates} sparse →{' '}
          {response.retrieval.final_context} used · {response.latency_ms}ms
        </p>
      </div>
    )
  }

  const isStrongPass = response.grounding_verdict === 'pass'

  return (
    <div className="fade-in-up space-y-3">
      <UserBubble question={question} />

      <div className="flex items-start gap-2">
        <AiAvatar />
        <div
          className={`card-shadow flex-1 rounded-2xl border bg-surface p-6 ${
            isStrongPass ? 'border-l-4 border-l-sage' : ''
          }`}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              SpecGuard AI · Grounded Answer
            </p>
            <GroundingBadge grounded={response.grounded} groundingVerdict={response.grounding_verdict} />
          </div>

          <div className="answer-content prose prose-sm max-w-[760px] text-ink prose-p:my-1.5 prose-headings:text-ink prose-strong:text-ink">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p>{withCitations(children, response.sources, citationCounts)}</p>,
                li: ({ children }) => <li>{withCitations(children, response.sources, citationCounts)}</li>,
              }}
            >
              {response.answer}
            </ReactMarkdown>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <span className="text-xs text-ink-muted">
              {response.retrieval.dense_candidates} dense · {response.retrieval.sparse_candidates} sparse →{' '}
              {response.retrieval.final_context} used · {response.latency_ms}ms
            </span>
          </div>

          <SourceList sources={response.sources} onViewEvidence={onViewEvidence} />
          <SourcesSummary sources={response.sources} />
          <ActionRow
            answerText={response.answer}
            onViewEvidence={onViewEvidence}
            onRegenerate={onRegenerate}
            regenerating={regenerating}
          />
        </div>
      </div>
    </div>
  )
}
