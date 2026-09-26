import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/client'
import { useIngredients, useMovements, useRecordMovement, useSaveIngredient, type IngredientFilters } from '@/api/admin'
import type { Ingredient, MovementType } from '@/api/types'
import { useEventStream } from '@/realtime/useEventStream'
import { LiveIndicator } from '@/staff/LiveIndicator'
import { Dialog } from '@/ui/Dialog'
import { Switch } from '@/ui/Switch'
import { formatDateTime, formatQuantity } from '@/ui/format'
import { useDebounced } from '@/ui/useDebounced'
import { useToast } from '@/ui/toast'

const QTY = /^\d{1,9}(\.\d{1,3})?$/
const UNITS = ['g', 'ml', 'pcs', 'kg', 'l']
type Status = NonNullable<IngredientFilters['status']>

const MOVEMENT_LABEL: Record<MovementType, string> = {
  sale: 'Sale',
  delivery: 'Delivery',
  restock: 'Restock',
  waste: 'Waste',
  adjustment: 'Adjustment',
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as Status | null) ?? 'all'
  const [search, setSearch] = useState('')
  const ingredients = useIngredients({ search: useDebounced(search.trim()) || undefined, status })
  const [stockFor, setStockFor] = useState<Ingredient | null>(null)
  const [historyFor, setHistoryFor] = useState<Ingredient | null>(null)
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)

  const stream = useEventStream('/admin/events', {
    onEvent: (event) => {
      if (event === 'stock.changed') void queryClient.invalidateQueries({ queryKey: ['admin', 'ingredients'] })
    },
  })

  const rows = ingredients.data ?? []
  const lowCount = rows.filter((row) => row.isLow).length

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Inventory</h1>
          <p className="muted">Stock only changes through the ledger: sales, deliveries, restocks, waste and adjustments.</p>
        </div>
        <div className="header-chips">
          <LiveIndicator state={stream} />
          <button type="button" className="button button-primary" onClick={() => setEditing('new')}>+ New ingredient</button>
        </div>
      </header>

      <div className="filter-bar">
        <input type="search" className="search-input" placeholder="Search ingredients" value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="segmented" role="radiogroup" aria-label="Filter">
          {(['all', 'low', 'active', 'inactive'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={status === value}
              className={status === value ? 'is-selected' : ''}
              onClick={() => setParams(value === 'all' ? {} : { status: value }, { replace: true })}
            >
              {value === 'all' ? 'All' : value === 'low' ? 'Low stock' : value === 'active' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <span className="muted small">{rows.length} ingredients{status === 'all' && lowCount > 0 ? ` · ${lowCount} low` : ''}</span>
      </div>

      <section className="panel table-panel">
        {ingredients.isError && <p className="form-error">{errorMessage(ingredients.error)}</p>}
        <table className="data-table">
          <thead>
            <tr><th>Ingredient</th><th>In stock</th><th className="num">Reorder at</th><th className="num">Used in</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((ingredient) => {
              const reorder = Number(ingredient.reorderLevel)
              const ratio = reorder > 0 ? Math.min(1, Number(ingredient.stockQty) / (reorder * 3)) : 1
              return (
                <tr key={ingredient.id}>
                  <td>
                    <button type="button" className="link-button strong" onClick={() => setEditing(ingredient)}>{ingredient.name}</button>
                  </td>
                  <td className="stock-cell">
                    <span className="num-text">{formatQuantity(ingredient.stockQty)} {ingredient.unit}</span>
                    <span className={`meter small${ingredient.isLow ? ' is-low' : ''}`} aria-hidden="true">
                      <span style={{ width: `${Math.max(2, ratio * 100)}%` }} />
                    </span>
                  </td>
                  <td className="num">{formatQuantity(ingredient.reorderLevel)} {ingredient.unit}</td>
                  <td className="num">{ingredient.usedInProducts}</td>
                  <td>
                    {!ingredient.isActive ? (
                      <span className="status-pill status-pill-cancelled">Inactive</span>
                    ) : ingredient.isLow ? (
                      <span className="status-pill status-pill-unpaid"><span aria-hidden="true">! </span>Low stock</span>
                    ) : (
                      <span className="status-pill status-pill-completed"><span aria-hidden="true">✓ </span>OK</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="button button-secondary small" onClick={() => setStockFor(ingredient)}>Stock ±</button>
                    <button type="button" className="button button-ghost small" onClick={() => setHistoryFor(ingredient)}>History</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {ingredients.isPending && <div className="skeleton-list">{[0, 1, 2, 3].map((key) => <div key={key} className="skeleton" />)}</div>}
        {!ingredients.isPending && rows.length === 0 && <div className="empty-state small"><p>No ingredients match.</p></div>}
      </section>

      {stockFor && <MovementDialog ingredient={stockFor} onClose={() => setStockFor(null)} />}
      {historyFor && <HistoryDialog ingredient={historyFor} onClose={() => setHistoryFor(null)} />}
      {editing && <IngredientDialog ingredient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function MovementDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const record = useRecordMovement()
  const toast = useToast()
  const [type, setType] = useState<'restock' | 'waste' | 'adjustment'>('restock')
  const [quantity, setQuantity] = useState('')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [note, setNote] = useState('')

  const current = Number(ingredient.stockQty)
  const amount = QTY.test(quantity) ? Number(quantity) : 0
  const delta = type === 'restock' ? amount : type === 'waste' ? -amount : amount * direction
  const next = current + delta
  const valid = amount > 0 && next >= 0 && (type !== 'adjustment' || note.trim().length > 0)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    record.mutate(
      {
        id: ingredient.id,
        type,
        quantity: type === 'adjustment' && direction === -1 ? `-${quantity}` : quantity,
        note: note.trim() || null,
      },
      {
        onSuccess: (updated) => {
          toast(`${ingredient.name}: now ${formatQuantity(updated.stockQty)} ${ingredient.unit}`)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open onClose={onClose} title={`Update stock · ${ingredient.name}`} size="small">
      <form className="stack" onSubmit={submit}>
        <div className="segmented full" role="radiogroup" aria-label="Movement type">
          {(['restock', 'waste', 'adjustment'] as const).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={type === value} className={type === value ? 'is-selected' : ''} onClick={() => setType(value)}>
              {MOVEMENT_LABEL[value]}
            </button>
          ))}
        </div>
        <p className="muted small">
          {type === 'restock' && 'Stock bought outside a supplier delivery.'}
          {type === 'waste' && 'Spilled, expired or damaged. It is subtracted from stock.'}
          {type === 'adjustment' && 'A stock-count correction. Explain why in the note.'}
        </p>
        {type === 'adjustment' && (
          <div className="segmented full" role="radiogroup" aria-label="Direction">
            <button type="button" role="radio" aria-checked={direction === 1} className={direction === 1 ? 'is-selected' : ''} onClick={() => setDirection(1)}>Add</button>
            <button type="button" role="radio" aria-checked={direction === -1} className={direction === -1 ? 'is-selected' : ''} onClick={() => setDirection(-1)}>Remove</button>
          </div>
        )}
        <label className="field">
          <span>Quantity</span>
          <div className="qty-input">
            <input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/[^\d.]/g, ''))} autoFocus placeholder="0" />
            <span>{ingredient.unit}</span>
          </div>
        </label>
        <label className="field">
          <span>Note {type === 'adjustment' ? '' : <small>(optional)</small>}</span>
          <input value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder={type === 'waste' ? 'e.g. milk expired' : ''} />
        </label>
        <div className={`stock-preview${next < 0 ? ' is-short' : ''}`}>
          <span>{formatQuantity(current)} {ingredient.unit}</span>
          <span aria-hidden="true">→</span>
          <strong>{amount > 0 ? `${formatQuantity(Math.max(next, 0))} ${ingredient.unit}` : '—'}</strong>
        </div>
        {next < 0 && <p className="form-error small">That would take stock below zero.</p>}
        {record.isError && <p className="form-error">{errorMessage(record.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!valid || record.isPending}>{record.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}

function HistoryDialog({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const movements = useMovements(ingredient.id)
  const rows = movements.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <Dialog open onClose={onClose} title={`Stock history · ${ingredient.name}`} size="medium">
      <p className="muted small">Now {formatQuantity(ingredient.stockQty)} {ingredient.unit}. Every change is listed; nothing is ever edited or deleted.</p>
      <table className="data-table compact">
        <thead><tr><th>When</th><th>Type</th><th className="num">Change</th><th>Reference</th><th>By</th></tr></thead>
        <tbody>
          {rows.map((movement) => (
            <tr key={movement.id}>
              <td className="small">{formatDateTime(movement.createdAt)}</td>
              <td><span className={`movement-tag movement-${movement.movementType}`}>{MOVEMENT_LABEL[movement.movementType]}</span></td>
              <td className="num">{Number(movement.quantityDelta) > 0 ? '+' : '−'}{formatQuantity(Math.abs(Number(movement.quantityDelta)))} {ingredient.unit}</td>
              <td className="small">
                {movement.orderNumber ? `Order #${movement.orderNumber}` : movement.deliveryId ? `Delivery #${movement.deliveryId}` : movement.note ?? ''}
              </td>
              <td className="small">{movement.employeeName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {movements.isPending && <div className="skeleton" />}
      {movements.hasNextPage && (
        <button type="button" className="button button-secondary load-more" onClick={() => void movements.fetchNextPage()} disabled={movements.isFetchingNextPage}>
          {movements.isFetchingNextPage ? 'Loading…' : 'Load older'}
        </button>
      )}
    </Dialog>
  )
}

function IngredientDialog({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const save = useSaveIngredient()
  const toast = useToast()
  const [form, setForm] = useState({
    name: ingredient?.name ?? '',
    unit: ingredient?.unit ?? 'g',
    reorderLevel: ingredient ? String(Number(ingredient.reorderLevel)) : '',
    openingStock: '',
    isActive: ingredient?.isActive ?? true,
  })
  const valid = form.name.trim() && QTY.test(form.reorderLevel) && (!form.openingStock || QTY.test(form.openingStock))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    save.mutate(
      ingredient
        ? { id: ingredient.id, name: form.name.trim(), unit: form.unit, reorderLevel: form.reorderLevel, isActive: form.isActive }
        : { name: form.name.trim(), unit: form.unit, reorderLevel: form.reorderLevel, isActive: form.isActive, ...(form.openingStock ? { openingStock: form.openingStock } : {}) },
      {
        onSuccess: () => {
          toast(ingredient ? 'Ingredient saved' : 'Ingredient created')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open onClose={onClose} title={ingredient ? `Edit ${ingredient.name}` : 'New ingredient'} size="small">
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input value={form.name} maxLength={80} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Unit</span>
            <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
              {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Reorder at</span>
            <input inputMode="decimal" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
          </label>
        </div>
        {!ingredient && (
          <label className="field">
            <span>Opening stock <small>(recorded as an adjustment)</small></span>
            <input inputMode="decimal" value={form.openingStock} onChange={(event) => setForm({ ...form, openingStock: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0" />
          </label>
        )}
        <label className="field toggle-field">
          <span>Active <small>(inactive ingredients make their products unavailable)</small></span>
          <Switch checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} label="Active" />
        </label>
        {ingredient && <p className="muted small">To change the amount in stock, use “Stock ±” so the change is recorded in the ledger.</p>}
        {save.isError && <p className="form-error">{errorMessage(save.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}

