import type { OrderStatus } from '@/api/types'

export const ORDER_LABEL: Record<OrderStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Preparing',
  serving: 'Ready',
  completed: 'Picked up',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export const orderStatusLabel = (status: OrderStatus) => ORDER_LABEL[status]
