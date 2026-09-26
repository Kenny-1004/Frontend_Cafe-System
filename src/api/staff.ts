import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { json, request } from '@/api/client'
import type {
  Board,
  CashierOrder,
  CashierOrderSummary,
  CashierSummary,
  OrderStatus,
  PaymentResult,
  Staff,
} from '@/api/types'

/* ---------- Auth ---------- */
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    request<{ staff: Staff; sessionExpiresAt: string }>('/auth/login', json('POST', credentials)),
  logout: () => request<null>('/auth/logout', json('POST')),
  // 200 with staff: null when nobody is signed in; renews an expired access token itself
  session: () => request<{ staff: Staff | null }>('/auth/session'),
}

/* ---------- Cashier ---------- */
export const cashierKeys = {
  all: ['cashier'] as const,
  list: (status: OrderStatus) => ['cashier', 'orders', status] as const,
  order: (id: number) => ['cashier', 'order', id] as const,
  summary: ['cashier', 'summary'] as const,
}

export const cashierApi = {
  list: (status: OrderStatus) => request<CashierOrderSummary[]>(`/cashier/orders?status=${status}`),
  byNumber: (orderNumber: number) => request<CashierOrder>(`/cashier/orders/by-number/${orderNumber}`),
  byId: (id: number) => request<CashierOrder>(`/cashier/orders/${id}`),
  pay: ({ id, customerName, cashTendered }: { id: number; customerName: string; cashTendered: string }) =>
    request<PaymentResult>(`/cashier/orders/${id}/payment`, json('POST', { customerName, cashTendered })),
  cancel: (id: number) => request<{ orderId: number; status: OrderStatus }>(`/cashier/orders/${id}/cancel`, json('POST')),
  summary: () => request<CashierSummary>('/cashier/summary'),
}

export function useUnpaidOrders() {
  return useQuery({ queryKey: cashierKeys.list('unpaid'), queryFn: () => cashierApi.list('unpaid'), refetchInterval: 60_000 })
}

export function useCashierOrder(id: number | null) {
  return useQuery({
    queryKey: cashierKeys.order(id ?? 0),
    queryFn: () => cashierApi.byId(id!),
    enabled: id !== null,
  })
}

export function useCashierSummary() {
  return useQuery({ queryKey: cashierKeys.summary, queryFn: cashierApi.summary, refetchInterval: 60_000 })
}

export function usePayOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cashierApi.pay,
    onSettled: () => queryClient.invalidateQueries({ queryKey: cashierKeys.all }),
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cashierApi.cancel,
    onSettled: () => queryClient.invalidateQueries({ queryKey: cashierKeys.all }),
  })
}

/* ---------- Orders board ---------- */
export const boardKeys = { board: ['board'] as const }

export const boardApi = {
  snapshot: () => request<Board>('/board'),
  serve: (id: number) => request<{ orderId: number }>(`/board/orders/${id}/serve`, json('POST')),
  complete: (orderIds: number[]) => request<{ cleared: number }>('/board/orders/complete', json('POST', { orderIds })),
}

export function useBoard() {
  return useQuery({ queryKey: boardKeys.board, queryFn: boardApi.snapshot, refetchInterval: 60_000 })
}

export function useServeOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: boardApi.serve,
    // Optimistic: move the card to Serving immediately; the snapshot confirms it
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.board })
      const previous = queryClient.getQueryData<Board>(boardKeys.board)
      if (previous) {
        const card = previous.pending.find((row) => row.id === id)
        if (card) {
          queryClient.setQueryData<Board>(boardKeys.board, {
            pending: previous.pending.filter((row) => row.id !== id),
            serving: [...previous.serving, { ...card, status: 'serving', servingAt: new Date().toISOString() }],
          })
        }
      }
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(boardKeys.board, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.board }),
  })
}

export function useCompleteOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: boardApi.complete,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.board })
      const previous = queryClient.getQueryData<Board>(boardKeys.board)
      if (previous) {
        queryClient.setQueryData<Board>(boardKeys.board, {
          ...previous,
          serving: previous.serving.filter((row) => !ids.includes(row.id)),
        })
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(boardKeys.board, context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.board }),
  })
}
