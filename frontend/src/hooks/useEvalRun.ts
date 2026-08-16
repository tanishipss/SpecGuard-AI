import { useQuery } from '@tanstack/react-query'
import { fetchEvalAblation, fetchEvalRun } from '../api/client'

export function useEvalRun() {
  return useQuery({
    queryKey: ['eval-run'],
    queryFn: fetchEvalRun,
    retry: false,
  })
}

export function useEvalAblation() {
  return useQuery({
    queryKey: ['eval-ablation'],
    queryFn: fetchEvalAblation,
    retry: false,
  })
}
