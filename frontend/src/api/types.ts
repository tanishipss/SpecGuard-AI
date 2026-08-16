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
  document_id: string
  chunk_id: string
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
  chunk_count: number
}

export interface DocumentSection {
  chunk_id: string
  section: string
  subsection: string | null
  section_title: string
  page_start: number
  page_end: number
  content: string
  token_count: number
}

export interface DocumentDetail {
  id: string
  spec_number: string
  title: string
  release: string
  version: string
  ingested_at: string
  chunk_count: number
  sections: DocumentSection[]
}

export interface DocumentSearchResult {
  chunk_id: string
  section: string
  subsection: string | null
  section_title: string
  page_start: number
  page_end: number
  snippet: string
}

export interface SignupRequest {
  full_name: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface UpdateProfileRequest {
  full_name: string
}

export interface UserOut {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: UserOut
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}
