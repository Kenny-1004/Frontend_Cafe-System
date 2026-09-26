import { useQuery } from '@tanstack/react-query'
import { request } from '@/api/client'

export type DisplayOrder = { orderNumber: number; name: string; since: string }
export type DisplayBoard = { preparing: DisplayOrder[]; ready: DisplayOrder[] }

export const displayKeys = { board: ['display'] as const }

// Public now-serving screen. Live events drive updates; polling is a safety net.
export function useDisplay() {
  return useQuery({
    queryKey: displayKeys.board,
    queryFn: () => request<DisplayBoard>('/display'),
    refetchInterval: 30_000,
  })
}
