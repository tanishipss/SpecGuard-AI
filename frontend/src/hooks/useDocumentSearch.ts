import { useMutation } from '@tanstack/react-query'
import { searchDocument } from '../api/client'

export function useDocumentSearch(documentId: string | undefined) {
  return useMutation({
    mutationFn: (q: string) => searchDocument(documentId as string, q),
  })
}
