import { useState } from 'react'
import { errorMessage } from '@/api/client'
import { useAdminOrder, useAdminOrders, type OrderFilters } from '@/api/admin'
import type { OrderStatus } from '@/api/types'
import { formatMoney } from '@/lib/money'
import { Dialog } from '@/ui/Dialog'
import { OrderStatusBadge } from '@/ui/StatusBadge'
import { orderStatusLabel } from '@/ui/statusLabels'
import { formatDate, formatDateTime, formatTime } from '@/ui/format'
import { useDebounced } from '@/ui/useDebounced'

const STATUSES: OrderStatus[] = ['unpaid', 'pending', 'serving', 'completed', 'cancelled', 'expired']

export function OrdersPage() {
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)
  const filters: OrderFilters = { date, status, search: useDebounced(search.trim()) }
  const orders = useAdminOrders(filters)
  const rows = orders.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Orders</h1>
          <p className="muted">Every order with who handled it. Newest first.</p>
        </div>
      </header>

      <div className="filter-bar">
        <input type="search" className="search-input" placeholder="Order # or customer name" value={search} onChange={(event) => setSearch(event.target.value)} />
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Business date" />
        <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | '')} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((value) => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}
        </select>
        {(date || status || search) && (
          <button type="button" className="link-button" onClick={() => { setDate(''); setStatus(''); setSearch('') }}>Clear filters</button>
        )}
      </div>

      <section className="panel table-panel">
        {orders.isError && <p className="form-error">{errorMessage(orders.error)}</p>}
        <table className="data-table clickable">
          <thead>
            <tr>
              <th>Order</th><th>Date</th><th>Customer</th><th>Service</th><th className="num">Items</th><th className="num">Total</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} onClick={() => setOpenId(order.id)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setOpenId(order.id)}>
                <td><strong>#{order.orderNumber}</strong></td>
                <td>{formatDate(order.businessDate)} <span className="muted small">{formatTime(order.createdAt)}</span></td>
                <td>{order.customerName ?? <span className="muted">—</span>}</td>
                <td>{order.serviceType === 'take_out' ? 'Take out' : 'Dine in'}</td>
                <td className="num">{order.itemCount}</td>
                <td className="num">{formatMoney(order.total)}</td>
                <td><OrderStatusBadge status={order.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.isPending && <div className="skeleton-list">{[0, 1, 2].map((key) => <div key={key} className="skeleton" />)}</div>}
        {!orders.isPending && rows.length === 0 && <div className="empty-state small"><p>No orders match these filters.</p></div>}
        {orders.hasNextPage && (
          <button type="button" className="button button-secondary load-more" onClick={() => void orders.fetchNextPage()} disabled={orders.isFetchingNextPage}>
            {orders.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>

      <OrderDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function OrderDetailDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const order = useAdminOrder(id)
  const data = order.data

  return (
    <Dialog open={id !== null} onClose={onClose} title={data ? `Order #${data.orderNumber}` : 'Order'} size="large">
      {order.isPending ? (
        <div className="skeleton tall" />
      ) : order.isError ? (
        <p className="form-error">{errorMessage(order.error)}</p>
      ) : data ? (
        <div className="order-detail">
          <div className="detail-facts">
            <div><span>Status</span><OrderStatusBadge status={data.status} /></div>
            <div><span>Customer</span><strong>{data.customerName ?? '—'}</strong></div>
            <div><span>Service</span><strong>{data.serviceType === 'take_out' ? 'Take out' : 'Dine in'}</strong></div>
            <div><span>Placed</span><strong>{formatDateTime(data.createdAt)}</strong></div>
          </div>

          <h3 className="section-title">Items</h3>
          <ul className="line-list">
            {data.items.map((item, index) => (
              <li key={index}>
                <span className="line-qty">{item.quantity}×</span>
                <span className="line-name">{item.name}{item.notes && <small>“{item.notes}”</small>}</span>
                <span className="line-amount">{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="order-total"><span>Total</span><strong>{formatMoney(data.total)}</strong></div>

          <h3 className="section-title">Payment</h3>
          {data.payment ? (
            <div className="detail-facts">
              <div><span>Cash received</span><strong>{formatMoney(data.payment.cashTendered)}</strong></div>
              <div><span>Change given</span><strong>{formatMoney(data.payment.changeGiven)}</strong></div>
              <div><span>Cashier</span><strong>{data.payment.receivedByName}</strong></div>
              <div><span>Paid</span><strong>{formatDateTime(data.payment.paidAt)}</strong></div>
            </div>
          ) : (
            <p className="muted">Not paid.</p>
          )}

          <h3 className="section-title">Timeline</h3>
          <ol className="timeline">
            {data.history.map((entry) => (
              <li key={entry.id}>
                <span className="timeline-dot" aria-hidden="true" />
                <div>
                  <p><OrderStatusBadge status={entry.toStatus} /> <span className="muted small">{formatDateTime(entry.changedAt)}</span></p>
                  <p className="small">
                    {entry.fromStatus === null ? 'Placed at the kiosk' : entry.changedByName ? `by ${entry.changedByName}` : 'by the system (24-hour expiry)'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Dialog>
  )
}
