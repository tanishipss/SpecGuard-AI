import {
  ApiError,
  type AblationResults,
  type ChatRequest,
  type ChatResponse,
  type DocumentDetail,
  type DocumentOut,
  type DocumentSearchResult,
  type EvalRunResponse,
  type LoginRequest,
  type SignupRequest,
  type TokenResponse,
  type UpdateProfileRequest,
  type UserOut,
} from './types'

const BASE_URL = '/api/v1'
const TOKEN_KEY = 'specguard_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  const token = getToken()
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the backend. Is it running?')
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new ApiError(response.status, detail?.detail ?? `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export function postChat(body: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(body) })
}

export function listDocuments(): Promise<DocumentOut[]> {
  return request<DocumentOut[]>('/documents')
}

export function getDocument(documentId: string): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/documents/${documentId}`)
}

export function searchDocument(documentId: string, q: string): Promise<DocumentSearchResult[]> {
  return request<DocumentSearchResult[]>(`/documents/${documentId}/search?q=${encodeURIComponent(q)}`)
}

export function signup(body: SignupRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body) })
}

export function login(body: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export function fetchMe(): Promise<UserOut> {
  return request<UserOut>('/auth/me')
}

export function updateProfile(body: UpdateProfileRequest): Promise<UserOut> {
  return request<UserOut>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) })
}

export function fetchEvalRun(): Promise<EvalRunResponse> {
  return request<EvalRunResponse>('/eval/run')
}

// Ablation genuinely may not exist yet (run_ablation.py hasn't been run) —
// the backend reports that as a 404, and this returns null for it rather
// than throwing, so the caller can render an honest "not yet run" state
// instead of an error.
export async function fetchEvalAblation(): Promise<AblationResults | null> {
  try {
    return await request<AblationResults>('/eval/ablation')
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
