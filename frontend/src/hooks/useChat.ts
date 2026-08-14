import { useMutation } from '@tanstack/react-query'
import { postChat } from '../api/client'
import type { ChatRequest } from '../api/types'

export function useChat() {
  return useMutation({
    mutationFn: (request: ChatRequest) => postChat(request),
  })
}
