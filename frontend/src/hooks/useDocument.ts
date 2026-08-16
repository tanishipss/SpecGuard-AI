import { useQuery } from '@tanstack/react-query'
import { getDocument } from '../api/client'
import { ApiError } from '../api/types'

export function useDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId as string),
    enabled: Boolean(documentId),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 2
    },
  })
}
