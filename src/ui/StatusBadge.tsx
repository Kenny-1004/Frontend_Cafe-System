import type { DeliveryStatus, OrderStatus } from '@/api/types'

import { ORDER_LABEL } from '@/ui/statusLabels'

const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  ordered: 'On the way',
  received: 'Received',
  cancelled: 'Cancelled',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`status-pill status-pill-${status}`}>{ORDER_LABEL[status]}</span>
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`status-pill status-pill-delivery-${status}`}>{DELIVERY_LABEL[status]}</span>
}

