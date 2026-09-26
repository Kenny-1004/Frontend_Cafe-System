import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, request } from '@/api/client'
import type { MenuCategory, Order, OrderStatus, PlaceOrderInput } from '@/api/types'

export type KioskSession = { kiosk: { id: number; name: string } | null; preview: boolean }

export const kioskApi = {
  // Not a paired tablet? A manager's expired access token is renewed via /auth/session
  // (always 200), then the kiosk session is asked again for the preview.
  session: async () => {
    const first = await request<KioskSession>('/kiosk/session')
    if (first.kiosk) return first
    const staff = await request<{ staff: unknown }>('/auth/session')
    return staff.staff ? request<KioskSession>('/kiosk/session') : first
  },
  pair: (code: string) => request<{ kiosk: { id: number; name: string } }>('/kiosk/pair', { method: 'POST', body: JSON.stringify({ code }) }),
  getMenu: () => request<MenuCategory[]>('/menu'),
  getOrder: (publicId: string) => request<Order>(`/orders/${publicId}`),
  // The Idempotency-Key makes a retry of the same checkout return the same order
  placeOrder: ({ input, idempotencyKey }: { input: PlaceOrderInput; idempotencyKey: string }) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
}

export const kioskKeys = {
  session: ['kiosk-session'] as const,
  menu: ['menu'] as const,
  order: (publicId: string) => ['kiosk-order', publicId] as const,
}

const FINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'expired']
export const isFinalStatus = (status: OrderStatus) => FINAL_STATUSES.includes(status)

// Live updates arrive over SSE (menu.changed); the interval is only a safety net
export function useMenu() {
  return useQuery({
    queryKey: kioskKeys.menu,
    queryFn: kioskApi.getMenu,
    staleTime: 30_000,
    refetchInterval: 120_000,
  })
}

export function useOrder(publicId: string, enabled = true) {
  return useQuery({
    queryKey: kioskKeys.order(publicId),
    queryFn: () => kioskApi.getOrder(publicId),
    enabled,
    // Events drive updates; slow polling covers a proxy that drops the stream
    refetchInterval: (query) => {
      const order = query.state.data
      return order && isFinalStatus(order.status) ? false : 30_000
    },
  })
}

// Safe to retry once on a network error: the same idempotency key cannot create a second order
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: kioskApi.placeOrder,
    retry: (failureCount, error) => error instanceof ApiError && error.code === 'NETWORK_ERROR' && failureCount < 2,
    onSuccess: (order) => {
      queryClient.setQueryData(kioskKeys.order(order.publicId), order)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'PRODUCT_UNAVAILABLE') {
        void queryClient.invalidateQueries({ queryKey: kioskKeys.menu })
      }
    },
  })
}

// Which tablet this is (or a manager preview); 200 with kiosk: null when not paired
export function useKioskSession() {
  return useQuery({ queryKey: kioskKeys.session, queryFn: kioskApi.session, staleTime: 5 * 60_000, retry: 1 })
}

export function usePairKiosk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: kioskApi.pair,
    onSuccess: ({ kiosk }) => {
      queryClient.setQueryData<KioskSession>(kioskKeys.session, { kiosk, preview: false })
      void queryClient.invalidateQueries({ queryKey: kioskKeys.menu })
    },
  })
}
