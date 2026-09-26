import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage } from '@/api/client'
import {
  cashierApi,
  cashierKeys,
  useCancelOrder,
  useCashierOrder,
  useCashierSummary,
  usePayOrder,
  useUnpaidOrders,
} from '@/api/staff'
import type { CashierOrder, PaymentResult } from '@/api/types'
import { formatCents, formatMoney, toCents } from '@/lib/money'
import { useEventStream } from '@/realtime/useEventStream'
import { LiveIndicator } from '@/staff/LiveIndicator'
import { Dialog } from '@/ui/Dialog'
import { OrderStatusBadge } from '@/ui/StatusBadge'
import { elapsed, formatTime } from '@/ui/format'
import { useToast } from '@/ui/toast'
import { useNow } from '@/ui/useNow'

const CASH_PATTERN = /^\d{1,8}(\.\d{0,2})?$/
const QUICK_CASH = ['100', '200', '500', '1000']

export function CashierPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null)
  const unpaid = useUnpaidOrders()
  const summary = useCashierSummary()
  const now = useNow(30_000)

  const stream = useEventStream('/cashier/events', {
    onEvent: (_event, data) => {
      void queryClient.invalidateQueries({ queryKey: cashierKeys.list('unpaid') })
      void queryClient.invalidateQueries({ queryKey: cashierKeys.summary })
      const orderId = (data as { orderId?: number }).orderId
      if (orderId) void queryClient.invalidateQueries({ queryKey: cashierKeys.order(orderId) })
    },
    onConnect: () => void queryClient.invalidateQueries({ queryKey: cashierKeys.all }),
  })

  const select = (id: number) => {
    setLastPayment(null)
    setSelectedId(id)
  }

  return (
    <div className="staff-page cashier-page">
      <header className="staff-page-header">
        <div>
          <h1>Cashier</h1>
          <p className="muted">Look up the customer’s order number, take the cash, give the change.</p>
        </div>
        <div className="header-chips">
          {summary.data && (
            <>
              <span className="chip">You today: <strong>{summary.data.myPaidCount}</strong> paid · <strong>{formatMoney(summary.data.myPaidTotal)}</strong></span>
              <span className="chip">Café today: <strong>{formatMoney(summary.data.paidTotal)}</strong></span>
            </>
          )}
          <LiveIndicator state={stream} />
        </div>
      </header>

      <div className="cashier-grid">
        <section className="panel cashier-queue" aria-label="Orders waiting to pay">
          <LookupForm onFound={(order) => select(order.id)} />
          <div className="queue-heading">
            <h2>Waiting to pay</h2>
            <span className="count-badge">{unpaid.data?.length ?? 0}</span>
          </div>
          {unpaid.isPending ? (
            <div className="skeleton-list">{[0, 1, 2].map((key) => <div key={key} className="skeleton" />)}</div>
          ) : unpaid.isError ? (
            <p className="form-error">{errorMessage(unpaid.error)}</p>
          ) : unpaid.data.length === 0 ? (
            <div className="empty-state small">
              <span aria-hidden="true">☕</span>
              <p>No one is waiting to pay.</p>
            </div>
          ) : (
            <ul className="queue-list">
              {unpaid.data.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    className={`queue-item${order.id === selectedId ? ' is-selected' : ''}`}
                    onClick={() => select(order.id)}
                  >
                    <span className="queue-number">#{order.orderNumber}</span>
                    <span className="queue-meta">
                      {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {elapsed(order.createdAt, now)} ago
                    </span>
                    <span className="queue-total">{formatMoney(order.total)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel cashier-order" aria-live="polite">
          {lastPayment ? (
            <PaymentDone payment={lastPayment} onNext={() => { setLastPayment(null); setSelectedId(null) }} />
          ) : selectedId === null ? (
            <div className="empty-state">
              <span aria-hidden="true">🧾</span>
              <p className="empty-title">Ask the customer for their order number</p>
              <p className="muted">Type the number in the lookup box, or pick it from the waiting list.</p>
            </div>
          ) : (
            <OrderPanel
              key={selectedId}
              orderId={selectedId}
              onPaid={setLastPayment}
              onClosed={() => setSelectedId(null)}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function LookupForm({ onFound }: { onFound: (order: CashierOrder) => void }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const orderNumber = Number(value)
    if (!Number.isInteger(orderNumber) || orderNumber < 1) return
    setBusy(true)
    setError(null)
    try {
      const order = await cashierApi.byNumber(orderNumber)
      queryClient.setQueryData(cashierKeys.order(order.id), order)
      onFound(order)
      setValue('')
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? `No order #${orderNumber} today.` : errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="lookup" onSubmit={submit}>
      <label htmlFor="lookup-number">Order number</label>
      <div className="lookup-row">
        <span className="lookup-hash" aria-hidden="true">#</span>
        <input
          id="lookup-number"
          inputMode="numeric"
          autoComplete="off"
          placeholder="42"
          value={value}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 5))}
          autoFocus
        />
        <button type="submit" className="button button-primary" disabled={!value || busy}>
          {busy ? '…' : 'Find'}
        </button>
      </div>
      {error && <p className="form-error small" role="alert">{error}</p>}
    </form>
  )
}

function OrderPanel({ orderId, onPaid, onClosed }: { orderId: number; onPaid: (payment: PaymentResult) => void; onClosed: () => void }) {
  const order = useCashierOrder(orderId)
  const pay = usePayOrder()
  const cancel = useCancelOrder()
  const toast = useToast()
  const [name, setName] = useState('')
  const [cash, setCash] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (order.data?.status === 'unpaid') nameRef.current?.focus()
  }, [order.data?.status])

  if (order.isPending) {
    return <div className="page-state"><div className="spinner" aria-hidden="true" /></div>
  }
  if (order.isError) {
    return <p className="form-error">{errorMessage(order.error)}</p>
  }

  const data = order.data
  const payable = data.status === 'unpaid'
  const totalCents = toCents(data.total)
  const cashValid = CASH_PATTERN.test(cash)
  const cashCents = cashValid ? toCents(cash) : 0
  const changeCents = cashCents - totalCents
  const nameValid = name.trim().length >= 1 && name.trim().length <= 60
  const canPay = payable && nameValid && cashValid && changeCents >= 0 && !pay.isPending

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canPay) return
    pay.mutate(
      { id: data.id, customerName: name.trim(), cashTendered: cash },
      { onSuccess: (result) => onPaid(result) },
    )
  }

  const doCancel = () => {
    cancel.mutate(data.id, {
      onSuccess: () => {
        toast(`Order #${data.orderNumber} cancelled`)
        setConfirmCancel(false)
        onClosed()
      },
      onError: (error) => {
        setConfirmCancel(false)
        toast(errorMessage(error), 'error')
      },
    })
  }

  return (
    <form className="order-panel" onSubmit={submit}>
      <div className="order-panel-header">
        <div>
          <p className="eyebrow">Order</p>
          <p className="order-panel-number">#{data.orderNumber}</p>
        </div>
        <div className="order-panel-tags">
          <OrderStatusBadge status={data.status} />
          <span className="chip">{data.serviceType === 'take_out' ? 'Take out' : 'Dine in'}</span>
          <span className="muted small">Placed {formatTime(data.createdAt)}</span>
        </div>
      </div>

      <ul className="line-list">
        {data.items.map((item, index) => (
          <li key={index}>
            <span className="line-qty">{item.quantity}×</span>
            <span className="line-name">
              {item.name}
              {item.notes && <small>“{item.notes}”</small>}
            </span>
            <span className="line-amount">{formatMoney(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="order-total">
        <span>Total</span>
        <strong>{formatMoney(data.total)}</strong>
      </div>

      {!payable ? (
        <div className="notice">
          {data.status === 'cancelled' && 'This order was cancelled.'}
          {data.status === 'expired' && 'This order expired (not paid within 24 hours).'}
          {['pending', 'serving', 'completed'].includes(data.status) && `Already paid by ${data.customerName}.`}
        </div>
      ) : (
        <>
          <div className="pay-fields">
            <label className="field">
              <span>Customer’s name <small>(called out when ready)</small></span>
              <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="e.g. Kent" autoComplete="off" />
            </label>
            <label className="field">
              <span>Cash received</span>
              <div className="money-input">
                <span aria-hidden="true">₱</span>
                <input
                  inputMode="decimal"
                  value={cash}
                  onChange={(event) => {
                    const next = event.target.value.replace(/[^\d.]/g, '')
                    if (next === '' || CASH_PATTERN.test(next)) setCash(next)
                  }}
                  placeholder="0.00"
                  autoComplete="off"
                />
              </div>
            </label>
          </div>

          <div className="quick-cash" role="group" aria-label="Quick cash amounts">
            <button type="button" className="chip-button" onClick={() => setCash(data.total)}>Exact</button>
            {QUICK_CASH.filter((amount) => toCents(amount) >= totalCents).map((amount) => (
              <button key={amount} type="button" className="chip-button" onClick={() => setCash(amount)}>
                ₱{Number(amount).toLocaleString('en-PH')}
              </button>
            ))}
          </div>

          <div className={`change-preview${cashValid && changeCents < 0 ? ' is-short' : ''}`}>
            <span>{cashValid && changeCents < 0 ? 'Still due' : 'Change'}</span>
            <strong>{cashValid ? formatCents(Math.abs(changeCents)) : '—'}</strong>
          </div>

          {pay.isError && <p className="form-error" role="alert">{errorMessage(pay.error)}</p>}

          <div className="order-actions">
            <button type="button" className="button button-danger-ghost" onClick={() => setConfirmCancel(true)} disabled={pay.isPending}>
              Cancel order
            </button>
            <button type="submit" className="button button-primary button-large" disabled={!canPay}>
              {pay.isPending ? 'Confirming…' : `Confirm payment`}
            </button>
          </div>
        </>
      )}

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={`Cancel order #${data.orderNumber}?`}
        size="small"
        footer={
          <>
            <button type="button" className="button button-secondary" onClick={() => setConfirmCancel(false)}>Keep order</button>
            <button type="button" className="button button-danger" onClick={doCancel} disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
            </button>
          </>
        }
      >
        <p>Use this when the customer changed their mind or the order was placed by mistake. No stock has been used yet.</p>
      </Dialog>
    </form>
  )
}

function PaymentDone({ payment, onNext }: { payment: PaymentResult; onNext: () => void }) {
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => nextRef.current?.focus(), [])

  return (
    <div className="payment-done">
      <div className="payment-done-check" aria-hidden="true">✓</div>
      <p className="eyebrow">Give change</p>
      <p className="payment-done-change">{formatMoney(payment.change)}</p>
      <dl className="payment-done-facts">
        <div><dt>Order</dt><dd>#{payment.orderNumber}</dd></div>
        <div><dt>Customer</dt><dd>{payment.customerName}</dd></div>
        <div><dt>Total</dt><dd>{formatMoney(payment.total)}</dd></div>
        <div><dt>Cash received</dt><dd>{formatMoney(payment.cashTendered)}</dd></div>
      </dl>
      <p className="muted">The order is now on the barista’s board.</p>
      <button ref={nextRef} type="button" className="button button-primary button-large" onClick={onNext}>
        Next customer
      </button>
    </div>
  )
}
