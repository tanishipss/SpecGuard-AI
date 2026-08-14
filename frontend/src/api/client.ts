import { ApiError, type ChatRequest, type ChatResponse, type DocumentOut } from './types'

const BASE_URL = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
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
