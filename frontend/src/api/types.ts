export interface ChatRequest {
  question: string
  release?: string | null
  top_k?: number | null
}

export interface ChatSource {
  source_id: string
  spec_number: string
  release: string
  section: string
  page: number
  snippet: string
}

export interface RetrievalMeta {
  dense_candidates: number
  sparse_candidates: number
  reranked_candidates: number
  final_context: number
}

export interface ChatResponse {
  answer: string
  grounded: boolean
  sources: ChatSource[]
  retrieval: RetrievalMeta
  grounding_verdict: string | null
  latency_ms: number
}

export interface DocumentOut {
  id: string
  spec_number: string
  title: string
  release: string
  version: string
  ingested_at: string
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}
