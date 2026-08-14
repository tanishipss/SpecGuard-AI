import { useQuery } from '@tanstack/react-query'
import { listDocuments } from '../api/client'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
    retry: false,
  })
}
