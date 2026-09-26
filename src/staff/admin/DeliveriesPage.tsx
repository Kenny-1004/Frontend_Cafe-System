import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/client'
import {
  adminKeys,
  fetchSupplier,
  useCancelDelivery,
  useCreateDelivery,
  useDeliveries,
  useDelivery,
  useIngredients,
  useReceiveDelivery,
  useSupplier,
  useSuppliers,
} from '@/api/admin'
import type { DeliveryDetail, DeliveryStatus } from '@/api/types'
import { formatCents, formatMoney, toCents } from '@/lib/money'
import { Dialog } from '@/ui/Dialog'
import { DeliveryStatusBadge } from '@/ui/StatusBadge'
import { formatDate, formatDateTime, formatQuantity } from '@/ui/format'
import { useToast } from '@/ui/toast'

const QTY = /^\d{1,9}(\.\d{1,3})?$/
const MONEY = /^\d{1,8}(\.\d{1,2})?$/
type Tab = DeliveryStatus | 'all'

export function DeliveriesPage() {
  const [tab, setTab] = useState<Tab>('ordered')
  const deliveries = useDeliveries(tab)
  const [openId, setOpenId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const rows = deliveries.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Deliveries</h1>
          <p className="muted">Order from suppliers, then record what actually arrived. Stock goes up when you receive.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setCreating(true)}>+ New delivery</button>
      </header>

      <div className="filter-bar">
        <div className="segmented" role="radiogroup" aria-label="Delivery status">
          {([['ordered', 'On the way'], ['received', 'Received'], ['cancelled', 'Cancelled'], ['all', 'All']] as const).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={tab === value} className={tab === value ? 'is-selected' : ''} onClick={() => setTab(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="panel table-panel">
        {deliveries.isError && <p className="form-error">{errorMessage(deliveries.error)}</p>}
        <table className="data-table clickable">
          <thead>
            <tr><th>#</th><th>Supplier</th><th>Ordered</th><th>Expected</th><th className="num">Items</th><th className="num">Cost</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((delivery) => (
              <tr key={delivery.id} onClick={() => setOpenId(delivery.id)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setOpenId(delivery.id)}>
                <td><strong>#{delivery.id}</strong></td>
                <td>{delivery.supplierName}</td>
                <td>{formatDateTime(delivery.orderedAt)}</td>
                <td>{formatDate(delivery.expectedAt)}</td>
                <td className="num">{delivery.itemCount}</td>
                <td className="num">{formatMoney(delivery.totalCost)}</td>
                <td><DeliveryStatusBadge status={delivery.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {deliveries.isPending && <div className="skeleton-list">{[0, 1].map((key) => <div key={key} className="skeleton" />)}</div>}
        {!deliveries.isPending && rows.length === 0 && (
          <div className="empty-state small"><span aria-hidden="true">🚚</span><p>{tab === 'ordered' ? 'Nothing on the way.' : 'No deliveries here yet.'}</p></div>
        )}
        {deliveries.hasNextPage && (
          <button type="button" className="button button-secondary load-more" onClick={() => void deliveries.fetchNextPage()} disabled={deliveries.isFetchingNextPage}>
            Load more
          </button>
        )}
      </section>

      {openId !== null && <DeliveryDialog id={openId} onClose={() => setOpenId(null)} />}
      {creating && <NewDeliveryDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setTab('ordered'); setOpenId(id) }} />}
    </div>
  )
}

type Row = { ingredientId: string; quantity: string; unitCost: string }

function NewDeliveryDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const suppliers = useSuppliers()
  const ingredients = useIngredients({ status: 'active' })
  const create = useCreateDelivery()
  const toast = useToast()
  const [supplierId, setSupplierId] = useState('')
  const [expectedAt, setExpectedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([{ ingredientId: '', quantity: '', unitCost: '' }])
  const queryClient = useQueryClient()
  const supplier = useSupplier(supplierId ? Number(supplierId) : null)
  const priceOf = useMemo(() => new Map((supplier.data?.priceList ?? []).map((item) => [String(item.ingredientId), item.unitCost])), [supplier.data])

  // Picking a supplier pre-fills its price list: which ingredients it sells and at what cost.
  // The item rows are locked while the list loads, and a response for a supplier that is no
  // longer selected is ignored, so nothing the user typed is ever overwritten.
  const latestSupplier = useRef('')
  const [loadingPrices, setLoadingPrices] = useState(false)
  const chooseSupplier = async (id: string) => {
    setSupplierId(id)
    latestSupplier.current = id
    if (!id) return
    setLoadingPrices(true)
    try {
      const detail = await queryClient.fetchQuery({ queryKey: adminKeys.supplier(Number(id)), queryFn: () => fetchSupplier(Number(id)) })
      if (latestSupplier.current !== id || detail.priceList.length === 0) return
      setRows((current) =>
        current.some((row) => row.ingredientId && row.quantity)
          ? current
          : detail.priceList.map((item) => ({ ingredientId: String(item.ingredientId), quantity: '', unitCost: item.unitCost })),
      )
    } finally {
      if (latestSupplier.current === id) setLoadingPrices(false)
    }
  }

  const filled = rows.filter((row) => row.ingredientId && row.quantity)
  const ids = filled.map((row) => row.ingredientId)
  const duplicate = ids.some((id, index) => ids.indexOf(id) !== index)
  const rowsValid = filled.every((row) => QTY.test(row.quantity) && Number(row.quantity) > 0 && MONEY.test(row.unitCost))
  const valid = supplierId && filled.length > 0 && rowsValid && !duplicate
  const unitOf = new Map((ingredients.data ?? []).map((ingredient) => [String(ingredient.id), ingredient.unit]))
  const totalCents = filled.reduce((sum, row) => sum + (MONEY.test(row.unitCost) && QTY.test(row.quantity) ? Math.round(toCents(row.unitCost) * Number(row.quantity)) : 0), 0)
  const activeSuppliers = (suppliers.data ?? []).filter((row) => row.isActive)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    create.mutate(
      {
        supplierId: Number(supplierId),
        expectedAt: expectedAt || null,
        notes: notes.trim() || null,
        items: filled.map((row) => ({ ingredientId: Number(row.ingredientId), quantity: row.quantity, unitCost: row.unitCost })),
      },
      { onSuccess: (delivery) => { toast(`Delivery #${delivery.id} created`); onCreated(delivery.id) } },
    )
  }

  return (
    <Dialog open onClose={onClose} title="New delivery" size="large">
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Supplier</span>
            <select value={supplierId} onChange={(event) => void chooseSupplier(event.target.value)} required>
              <option value="">Choose supplier…</option>
              {activeSuppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Expected on <small>(optional)</small></span>
            <input type="date" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Notes <small>(optional)</small></span>
          <input value={notes} maxLength={300} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. weekly order" />
        </label>

        <h3 className="section-title">
          Items <small className="muted">{loadingPrices ? 'loading the supplier’s price list…' : '(leave the quantity empty to skip a line)'}</small>
        </h3>
        <fieldset className="plain-fieldset" disabled={loadingPrices} aria-busy={loadingPrices}>
        <ul className="recipe-lines delivery-lines">
          {rows.map((row, index) => (
            <li key={index}>
              <select value={row.ingredientId} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, ingredientId: event.target.value, unitCost: priceOf.get(event.target.value) ?? item.unitCost } : item)))} aria-label="Ingredient">
                <option value="">Choose ingredient…</option>
                {ingredients.data?.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
              </select>
              <div className="qty-input">
                <input inputMode="decimal" placeholder="Qty" value={row.quantity} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, quantity: event.target.value.replace(/[^\d.]/g, '') } : item)))} aria-label="Quantity" />
                <span>{unitOf.get(row.ingredientId) ?? ''}</span>
              </div>
              <div className="money-input">
                <span aria-hidden="true">₱</span>
                <input inputMode="decimal" placeholder="Cost/unit" value={row.unitCost} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, unitCost: event.target.value.replace(/[^\d.]/g, '') } : item)))} aria-label="Unit cost" />
              </div>
              <button type="button" className="icon-button" onClick={() => setRows(rows.filter((_, i) => i !== index))} aria-label="Remove line">×</button>
            </li>
          ))}
        </ul>
        </fieldset>
        {duplicate && <p className="form-error small">Each ingredient can appear only once.</p>}
        {!rowsValid && filled.length > 0 && <p className="form-error small">Check quantities (&gt; 0) and costs (e.g. 1.20).</p>}
        {create.isError && <p className="form-error">{errorMessage(create.error)}</p>}
        <div className="form-actions spread">
          <button type="button" className="button button-secondary" onClick={() => setRows([...rows, { ingredientId: '', quantity: '', unitCost: '' }])}>+ Add line</button>
          <span className="muted">Estimated cost <strong>{formatCents(totalCents)}</strong></span>
          <button type="submit" className="button button-primary" disabled={!valid || create.isPending}>{create.isPending ? 'Creating…' : `Create delivery (${filled.length} items)`}</button>
        </div>
      </form>
    </Dialog>
  )
}

function DeliveryDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const delivery = useDelivery(id)
  const data = delivery.data

  return (
    <Dialog open onClose={onClose} title={`Delivery #${id}`} size="large">
      {delivery.isPending ? (
        <div className="skeleton tall" />
      ) : delivery.isError ? (
        <p className="form-error">{errorMessage(delivery.error)}</p>
      ) : data ? (
        <div className="stack">
          <div className="detail-facts">
            <div><span>Supplier</span><strong>{data.supplierName}</strong></div>
            <div><span>Status</span><DeliveryStatusBadge status={data.status} /></div>
            <div><span>Ordered</span><strong>{formatDateTime(data.orderedAt)} by {data.createdByName}</strong></div>
            <div><span>{data.status === 'received' ? 'Received' : 'Expected'}</span><strong>{data.status === 'received' ? `${formatDateTime(data.receivedAt)} by ${data.receivedByName}` : formatDate(data.expectedAt)}</strong></div>
          </div>
          {data.notes && <p className="notice">{data.notes}</p>}
          {data.status === 'ordered' ? (
            <ReceiveForm key={data.id} delivery={data} />
          ) : (
            <>
              <table className="data-table compact">
                <thead>
                  <tr><th>Ingredient</th><th className="num">Ordered</th><th className="num">Received</th><th className="num">Cost/unit</th><th className="num">Line</th></tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className="num">{formatQuantity(item.quantityOrdered)} {item.unit}</td>
                      <td className="num">{item.quantityReceived !== null ? `${formatQuantity(item.quantityReceived)} ${item.unit}` : '—'}</td>
                      <td className="num">{formatMoney(item.unitCost)}</td>
                      <td className="num">{formatMoney(item.lineCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="order-total"><span>Total cost</span><strong>{formatMoney(data.totalCost)}</strong></div>
            </>
          )}
        </div>
      ) : null}
    </Dialog>
  )
}

// What actually arrived: starts at the ordered quantities; 0 for a missing item
function ReceiveForm({ delivery }: { delivery: DeliveryDetail }) {
  const receive = useReceiveDelivery()
  const cancel = useCancelDelivery()
  const toast = useToast()
  const [received, setReceived] = useState<Record<number, string>>(() =>
    Object.fromEntries(delivery.items.map((item) => [item.ingredientId, String(Number(item.quantityOrdered))])),
  )
  const valid = delivery.items.every((item) => QTY.test(received[item.ingredientId] ?? ''))
  const totalCents = delivery.items.reduce(
    (sum, item) => sum + (QTY.test(received[item.ingredientId] ?? '') ? Math.round(toCents(item.unitCost) * Number(received[item.ingredientId])) : 0),
    0,
  )

  return (
    <>
      <table className="data-table compact">
        <thead>
          <tr><th>Ingredient</th><th className="num">Ordered</th><th className="num">Arrived</th><th className="num">Cost/unit</th></tr>
        </thead>
        <tbody>
          {delivery.items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="num">{formatQuantity(item.quantityOrdered)} {item.unit}</td>
              <td className="num">
                <div className="qty-input compact">
                  <input
                    inputMode="decimal"
                    value={received[item.ingredientId] ?? ''}
                    onChange={(event) => setReceived({ ...received, [item.ingredientId]: event.target.value.replace(/[^\d.]/g, '') })}
                    aria-label={`${item.name} received`}
                  />
                  <span>{item.unit}</span>
                </div>
              </td>
              <td className="num">{formatMoney(item.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="order-total"><span>Cost of what arrived</span><strong>{formatCents(totalCents)}</strong></div>
      {(receive.isError || cancel.isError) && <p className="form-error">{errorMessage(receive.error ?? cancel.error)}</p>}
      <div className="form-actions spread">
        <button
          type="button"
          className="button button-danger-ghost"
          disabled={cancel.isPending || receive.isPending}
          onClick={() => cancel.mutate(delivery.id, { onSuccess: () => toast(`Delivery #${delivery.id} cancelled`) })}
        >
          Cancel delivery
        </button>
        <span className="muted small">Enter what actually arrived (0 if an item is missing).</span>
        <button
          type="button"
          className="button button-primary"
          disabled={!valid || receive.isPending || cancel.isPending}
          onClick={() =>
            receive.mutate(
              { id: delivery.id, received: delivery.items.map((item) => ({ ingredientId: item.ingredientId, quantityReceived: received[item.ingredientId] })) },
              { onSuccess: () => toast(`Delivery #${delivery.id} received. Stock updated.`) },
            )
          }
        >
          {receive.isPending ? 'Receiving…' : 'Receive & add to stock'}
        </button>
      </div>
    </>
  )
}
