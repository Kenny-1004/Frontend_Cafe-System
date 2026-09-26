import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { isFinalStatus, kioskKeys, useOrder } from '@/api/kiosk'
import type { Order, OrderStatus, OrderStatusEvent } from '@/api/types'
import { formatMoney } from '@/lib/money'
import { useEventStream } from '@/realtime/useEventStream'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'unpaid', label: 'Order placed' },
  { status: 'pending', label: 'Preparing' },
  { status: 'serving', label: 'Ready' },
  { status: 'completed', label: 'Picked up' },
]

const STATUS_COPY: Record<OrderStatus, { title: string; text: string }> = {
  unpaid: { title: 'Please pay at the counter', text: 'Tell the cashier your order number. We start making it once it’s paid.' },
  pending: { title: 'We’re making your order', text: 'Thanks for paying! We’ll call your name when it’s ready.' },
  serving: { title: 'Your order is ready!', text: 'Please pick it up at the counter.' },
  completed: { title: 'Enjoy!', text: 'Your order has been picked up. See you again soon.' },
  cancelled: { title: 'This order was cancelled', text: 'Please place a new order if you still want something.' },
  expired: { title: 'This order has expired', text: 'Orders close automatically after 24 hours.' },
}

const RETURN_TO_MENU_MS = 15_000

export function OrderPage() {
  const { publicId = '' } = useParams()
  const validId = UUID.test(publicId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const order = useOrder(publicId, validId)
  const status = order.data?.status

  // Live status for this order only (the server filters by publicId)
  useEventStream(validId && status && !isFinalStatus(status) ? `/orders/${publicId}/events` : null, {
    onEvent: (event, data) => {
      if (event !== 'order.status') return
      const next = (data as OrderStatusEvent).status
      queryClient.setQueryData<Order>(kioskKeys.order(publicId), (current) => (current ? { ...current, status: next } : current))
      void queryClient.invalidateQueries({ queryKey: kioskKeys.order(publicId) })
    },
    onConnect: () => void queryClient.invalidateQueries({ queryKey: kioskKeys.order(publicId) }),
  })

  // Chime once when the order becomes ready (the doc's "order ready" kiosk alert)
  const previousStatus = useRef<OrderStatus | undefined>(undefined)
  useEffect(() => {
    if (status === 'serving' && previousStatus.current && previousStatus.current !== 'serving') playChime()
    previousStatus.current = status
  }, [status])

  // Free the kiosk for the next customer once the order is closed
  useEffect(() => {
    if (!status || !isFinalStatus(status)) return
    const timer = setTimeout(() => navigate('/'), RETURN_TO_MENU_MS)
    return () => clearTimeout(timer)
  }, [status, navigate])

  if (!validId || (order.error instanceof ApiError && order.error.status === 404)) {
    return (
      <main className="page-state">
        <p className="page-state-title">Order not found.</p>
        <Link to="/" className="button button-primary">Back to menu</Link>
      </main>
    )
  }

  if (order.isPending) {
    return (
      <main className="page-state">
        <div className="spinner" aria-hidden="true" />
        <p>Loading your receipt…</p>
      </main>
    )
  }

  if (order.isError) {
    return (
      <main className="page-state">
        <p className="page-state-title">We couldn’t load your order.</p>
        <p className="muted">{order.error.message}</p>
        <button type="button" className="button button-primary" onClick={() => void order.refetch()}>
          Try again
        </button>
      </main>
    )
  }

  const data = order.data
  const copy = STATUS_COPY[data.status]
  const stepIndex = STEPS.findIndex((step) => step.status === data.status)
  const closed = isFinalStatus(data.status)

  return (
    <main className="receipt-page">
      <section className={`receipt status-${data.status}`} aria-live="polite">
        <p className="receipt-eyebrow">Your order number</p>
        <p className="receipt-number">{data.orderNumber}</p>

        <div className={`status-banner status-banner-${data.status}`}>
          <p className="status-title">{copy.title}</p>
          <p className="status-text">{copy.text}</p>
        </div>

        {stepIndex >= 0 && (
          <ol className="progress" aria-label="Order progress">
            {STEPS.map((step, index) => (
              <li key={step.status} className={index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''}>
                <span className="progress-dot" aria-hidden="true" />
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="receipt-meta">
          <span>{data.serviceType === 'take_out' ? 'Take out' : 'Dine in'}</span>
          <span>{new Date(data.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>

        <ul className="receipt-lines">
          {data.items.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
              <span className="receipt-qty">{item.quantity}×</span>
              <span className="receipt-item">
                {item.name}
                {item.notes && <small>“{item.notes}”</small>}
              </span>
              <span className="receipt-amount">{formatMoney(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="receipt-total">
          <span>Total</span>
          <strong>{formatMoney(data.total)}</strong>
        </div>

        <Link to="/" className="button button-secondary button-block">
          {closed ? 'Start a new order' : 'Back to menu'}
        </Link>
        {closed && <p className="muted receipt-footnote">Returning to the menu shortly…</p>}
      </section>
    </main>
  )
}

// Two-note chime with the Web Audio API; silently skipped if the browser blocks audio
function playChime() {
  try {
    const audio = new AudioContext()
    ;[659.25, 880].forEach((frequency, index) => {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      const start = audio.currentTime + index * 0.25
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.65)
    })
  } catch {
    // Audio is a nice-to-have; the banner still shows
  }
}
