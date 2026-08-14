import { useState } from 'react'
import { ChatInput } from './components/ChatInput'
import { AnswerCard } from './components/AnswerCard'
import { ErrorBanner } from './components/ErrorBanner'
import { ReleaseSelector } from './components/ReleaseSelector'
import { useChat } from './hooks/useChat'
import type { ChatResponse } from './api/types'
import { ApiError } from './api/types'

interface Turn {
  question: string
  response: ChatResponse
}

function App() {
  const [release, setRelease] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const chat = useChat()

  const handleSubmit = (question: string) => {
    chat.mutate(
      { question, release: release || null },
      { onSuccess: (response) => setTurns((prev) => [...prev, { question, response }]) },
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">SpecGuard AI</h1>
            <p className="text-xs text-slate-500">3GPP Standards RAG Chatbot</p>
          </div>
          <ReleaseSelector value={release} onChange={setRelease} />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
        {turns.length === 0 && !chat.isPending && (
          <p className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
            Ask a question about the ingested 3GPP specifications. Answers are grounded only in indexed
            documents and every claim is cited.
          </p>
        )}

        {turns.map((turn, i) => (
          <AnswerCard key={i} question={turn.question} response={turn.response} />
        ))}

        {chat.isPending && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-500">
            Retrieving evidence and generating a grounded answer…
          </div>
        )}

        {chat.isError && (
          <ErrorBanner
            message={chat.error instanceof ApiError ? chat.error.message : 'Something went wrong.'}
          />
        )}
      </main>

      <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSubmit={handleSubmit} disabled={chat.isPending} />
        </div>
      </div>
    </div>
  )
}

export default App
