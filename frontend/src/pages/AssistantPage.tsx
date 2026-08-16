import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { PageShell } from '../components/layout/PageShell'
import { ChatInput } from '../components/ChatInput'
import { AnswerCard } from '../components/AnswerCard'
import { ErrorBanner } from '../components/ErrorBanner'
import { ReleaseSelector } from '../components/ReleaseSelector'
import { SuggestedQuestions } from '../components/SuggestedQuestions'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { useChat } from '../hooks/useChat'
import type { ChatResponse } from '../api/types'
import { ApiError } from '../api/types'

interface Turn {
  question: string
  response: ChatResponse
}

const TOPICS = [
  {
    title: 'Network Functions',
    description: 'AMF, SMF, UPF roles',
    question: 'What are the roles of the AMF, SMF, and UPF?',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="5" cy="5" r="2.2" />
        <circle cx="19" cy="5" r="2.2" />
        <circle cx="12" cy="19" r="2.2" />
        <path d="M6.8 6.4L11 17.3M17.2 6.4L13 17.3M7.2 5h9.6" />
      </svg>
    ),
  },
  {
    title: 'Session Procedures',
    description: 'PDU session, registration',
    question: 'Explain PDU session establishment.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3v6a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v4M17 3v6a4 4 0 0 1-4 4h-2a4 4 0 0 0-4 4v4" />
      </svg>
    ),
  },
  {
    title: 'Policy & Charging',
    description: 'QoS, 5QI, PCF',
    question: 'What is 5QI?',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" />
      </svg>
    ),
  },
]

const PIPELINE_STAGES = [
  'Understanding your question',
  'Retrieving relevant specifications',
  'Ranking supporting passages',
  'Generating answer',
]

function PipelineProgress() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
    const id = setInterval(() => {
      setActiveIndex((i) => Math.min(i + 1, PIPELINE_STAGES.length - 1))
    }, 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card-shadow rounded-2xl border bg-surface px-5 py-4">
      <div className="flex flex-col gap-2">
        {PIPELINE_STAGES.map((stage, i) => {
          const done = i < activeIndex
          const active = i === activeIndex
          return (
            <div key={stage} className="flex items-center gap-2.5 text-[12.5px]">
              {done ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-sage" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : active ? (
                <span className="h-3 w-3 shrink-0 animate-pulse rounded-full border-2 border-sage" />
              ) : (
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-border" />
              )}
              <span className={done || active ? 'font-medium text-ink' : 'text-ink-faint'}>{stage}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AssistantPage() {
  const location = useLocation()
  const [release, setRelease] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [evidenceFor, setEvidenceFor] = useState<Turn | null>(null)
  const [lastQuestion, setLastQuestion] = useState('')
  const chat = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Prefill only — read once on first render, never auto-submitted. Letting
  // the user's own Enter/click drive the mutation avoids an effect racing
  // an in-flight async mutation across a navigation boundary.
  const [prefillQuestion] = useState(
    () => (location.state as { prefillQuestion?: string } | null)?.prefillQuestion ?? '',
  )

  const handleSubmit = (question: string) => {
    setLastQuestion(question)
    chat.mutate(
      { question, release: release || null },
      { onSuccess: (response) => setTurns((prev) => [...prev, { question, response }]) },
    )
  }

  // Real regenerate — re-invokes the actual chat API with the same question
  // and replaces that turn's response with a genuinely new one.
  const handleRegenerate = (index: number) => {
    const question = turns[index].question
    chat.mutate(
      { question, release: release || null },
      {
        onSuccess: (response) =>
          setTurns((prev) => prev.map((t, i) => (i === index ? { question, response } : t))),
      },
    )
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, chat.isPending])

  const isEmpty = turns.length === 0 && !chat.isPending && !prefillQuestion

  return (
    <AppShell>
      <PageShell
        kicker="3GPP · Release 17"
        title="3GPP Standards Assistant"
        description="Explore Release 17 specifications with evidence-backed AI."
        className="flex h-full flex-col"
        actions={
          <>
            {turns.length > 0 && (
              <button
                type="button"
                onClick={() => setTurns([])}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-sage hover:text-ink"
              >
                Clear conversation
              </button>
            )}
            <ReleaseSelector value={release} onChange={setRelease} />
          </>
        }
      >
        <div className="relative flex-1">
          {/* Scroll fade — only relevant once there's conversation content to scroll past */}
          {!isEmpty && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-10 bg-gradient-to-b from-ivory to-transparent" />
          )}

          {isEmpty ? (
            <div className="fade-in-up relative w-full pb-8 pt-3">
              {/* Extremely subtle radial tint behind the workspace — texture, not color */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px]"
                style={{ background: 'radial-gradient(circle at 50% 8%, rgba(8,127,106,0.025), transparent 42%)' }}
                aria-hidden="true"
              />

              {/* Assistant workspace — one deliberate surface, not the whole page */}
              <div className="mx-auto max-w-[820px] rounded-[22px] border border-[#E1E3DF] bg-white/75 px-10 py-9 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_40px_rgba(0,0,0,0.035)]">
                <h2 className="font-display text-[26px] font-semibold tracking-[-0.025em] text-ink">
                  Ask SpecGuard AI
                </h2>
                <p className="mx-auto mt-2 max-w-[560px] text-[14px] leading-[1.55] text-ink-muted">
                  Ask anything about indexed Release 17 standards. Get evidence-backed answers with inline citations.
                </p>

                <div className="mx-auto mt-6 max-w-xl">
                  <ChatInput onSubmit={handleSubmit} disabled={chat.isPending} initialValue={prefillQuestion} />
                </div>

                <p className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-ink-muted">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-forest" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Grounded in indexed specifications · Evidence-backed responses · Inline citations
                </p>

                {/* Traceability strip — one restrained line, not an infographic */}
                <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-faint">
                  <span>Question</span>
                  <span aria-hidden="true">→</span>
                  <span>Retrieved Spec</span>
                  <span aria-hidden="true">→</span>
                  <span>Grounded Answer</span>
                  <span aria-hidden="true">→</span>
                  <span>Citation</span>
                </p>
              </div>

              {/* Suggested questions */}
              <div className="mx-auto mt-6 max-w-[850px] text-center">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Suggested Questions
                </p>
                <div className="mt-3">
                  <SuggestedQuestions onSelect={handleSubmit} disabled={chat.isPending} />
                </div>
              </div>

              {/* Explore topics — entry points into the indexed knowledge, not generic feature cards */}
              <div className="mx-auto mt-7 max-w-[820px]">
                <p className="text-center text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  Explore Topics
                </p>
                <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.title}
                      type="button"
                      onClick={() => handleSubmit(topic.question)}
                      disabled={chat.isPending}
                      className="flex h-[132px] flex-col justify-between rounded-2xl border border-border bg-surface p-[18px] text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#CFE1DC] hover:shadow-[0_8px_24px_rgba(0,0,0,0.045)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-sage-soft text-forest">
                          {topic.icon}
                        </span>
                        <p className="mt-2.5 text-[14px] font-semibold text-ink">{topic.title}</p>
                        <p className="mt-1 text-[12px] leading-[1.45] text-ink-muted">{topic.description}</p>
                      </div>
                      <span className="text-[11.5px] font-medium text-forest">Explore →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Capability strip — a technical trust statement, not a feature showcase */}
              <p className="mt-5 text-center font-mono text-[10.5px] tracking-[0.05em] text-[#8B8B86]">
                HYBRID RETRIEVAL · EVIDENCE GROUNDING · INDEPENDENT VALIDATION
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-8 pt-3">
              {turns.map((turn, i) => (
                <AnswerCard
                  key={i}
                  question={turn.question}
                  response={turn.response}
                  onViewEvidence={turn.response.sources.length > 0 ? () => setEvidenceFor(turn) : undefined}
                  onRegenerate={() => handleRegenerate(i)}
                  regenerating={chat.isPending}
                />
              ))}

              {chat.isPending && <PipelineProgress />}

              {chat.isError && (
                <ErrorBanner
                  message={
                    chat.error instanceof ApiError
                      ? chat.error.message
                      : "SpecGuard couldn't complete this query."
                  }
                  onRetry={() => handleSubmit(lastQuestion)}
                />
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="mx-auto w-full max-w-2xl">
            <div className="glass-strong sticky bottom-4 rounded-2xl p-2.5">
              <ChatInput onSubmit={handleSubmit} disabled={chat.isPending} initialValue={prefillQuestion} />
            </div>
          </div>
        )}
      </PageShell>

      {evidenceFor && (
        <EvidenceDrawer
          question={evidenceFor.question}
          sources={evidenceFor.response.sources}
          onClose={() => setEvidenceFor(null)}
        />
      )}
    </AppShell>
  )
}
