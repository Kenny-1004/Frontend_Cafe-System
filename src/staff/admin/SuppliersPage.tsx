import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/client'
import { useIngredients, useSavePriceList, useSaveSupplier, useSupplier, useSuppliers } from '@/api/admin'
import type { Supplier, SupplierDetail } from '@/api/types'
import { Dialog } from '@/ui/Dialog'
import { Switch } from '@/ui/Switch'
import { useToast } from '@/ui/toast'

const MONEY = /^\d{1,8}(\.\d{1,2})?$/

export function SuppliersPage() {
  const suppliers = useSuppliers()
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null)
  const [pricesFor, setPricesFor] = useState<Supplier | null>(null)

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="muted">Who sells what, and at what cost. Price lists pre-fill new deliveries.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setEditing('new')}>+ New supplier</button>
      </header>

      {suppliers.isError && <p className="form-error">{errorMessage(suppliers.error)}</p>}
      <div className="supplier-grid">
        {suppliers.isPending && [0, 1, 2].map((key) => <div key={key} className="skeleton tall" />)}
        {suppliers.data?.map((supplier) => (
          <article key={supplier.id} className={`panel supplier-card${supplier.isActive ? '' : ' is-inactive'}`}>
            <div className="panel-title-row">
              <h2 className="panel-title">{supplier.name}</h2>
              {!supplier.isActive && <span className="status-pill status-pill-cancelled">Inactive</span>}
            </div>
            <dl className="supplier-facts">
              <div><dt>Contact</dt><dd>{supplier.contactPerson ?? '—'}</dd></div>
              <div><dt>Phone</dt><dd>{supplier.phone ?? '—'}</dd></div>
              <div><dt>Email</dt><dd>{supplier.email ?? '—'}</dd></div>
              <div><dt>Address</dt><dd>{supplier.address ?? '—'}</dd></div>
            </dl>
            <p className="muted small">{supplier.ingredientCount} ingredients on the price list · {supplier.openDeliveries} open deliveries</p>
            <div className="form-actions">
              <button type="button" className="button button-secondary small" onClick={() => setPricesFor(supplier)}>Price list</button>
              <button type="button" className="button button-ghost small" onClick={() => setEditing(supplier)}>Edit</button>
            </div>
          </article>
        ))}
      </div>

      {editing && <SupplierDialog supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {pricesFor && <PriceListDialog supplier={pricesFor} onClose={() => setPricesFor(null)} />}
    </div>
  )
}

function SupplierDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const save = useSaveSupplier()
  const toast = useToast()
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    contactPerson: supplier?.contactPerson ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    address: supplier?.address ?? '',
    isActive: supplier?.isActive ?? true,
  })
  const emailOk = !form.email || /^\S+@\S+\.\S+$/.test(form.email)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim() || !emailOk) return
    const body = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      isActive: form.isActive,
    }
    save.mutate(supplier ? { id: supplier.id, ...body } : body, {
      onSuccess: () => {
        toast(supplier ? 'Supplier saved' : 'Supplier added')
        onClose()
      },
    })
  }

  const text = (key: 'name' | 'contactPerson' | 'phone' | 'email' | 'address', label: string, max: number) => (
    <label className="field">
      <span>{label}</span>
      <input value={form[key]} maxLength={max} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </label>
  )

  return (
    <Dialog open onClose={onClose} title={supplier ? `Edit ${supplier.name}` : 'New supplier'} size="small">
      <form className="stack" onSubmit={submit}>
        {text('name', 'Name', 80)}
        {text('contactPerson', 'Contact person', 80)}
        <div className="form-grid">
          {text('phone', 'Phone', 40)}
          {text('email', 'Email', 120)}
        </div>
        {!emailOk && <small className="field-error">Enter a valid email address</small>}
        {text('address', 'Address', 200)}
        <label className="field toggle-field">
          <span>Active <small>(inactive suppliers can’t get new deliveries)</small></span>
          <Switch checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} label="Active" />
        </label>
        {save.isError && <p className="form-error">{errorMessage(save.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!form.name.trim() || !emailOk || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}

function PriceListDialog({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const detail = useSupplier(supplier.id)
  return (
    <Dialog open onClose={onClose} title={`Price list · ${supplier.name}`} size="medium">
      {detail.isPending ? (
        <div className="skeleton tall" />
      ) : detail.isError ? (
        <p className="form-error">{errorMessage(detail.error)}</p>
      ) : (
        <PriceListEditor supplier={detail.data} onClose={onClose} />
      )}
    </Dialog>
  )
}

function PriceListEditor({ supplier, onClose }: { supplier: SupplierDetail; onClose: () => void }) {
  const ingredients = useIngredients({ status: 'active' })
  const save = useSavePriceList()
  const toast = useToast()
  const [rows, setRows] = useState(() => supplier.priceList.map((item) => ({ ingredientId: String(item.ingredientId), unitCost: item.unitCost })))

  const ids = rows.map((row) => row.ingredientId)
  const duplicate = ids.some((id, index) => id && ids.indexOf(id) !== index)
  const valid = !duplicate && rows.every((row) => row.ingredientId && MONEY.test(row.unitCost))
  const unitOf = new Map((ingredients.data ?? []).map((ingredient) => [String(ingredient.id), ingredient.unit]))

  return (
    <div className="stack">
      <p className="muted small">Cost per unit of the ingredient (per g, ml or piece). New deliveries from this supplier start from this list.</p>
      <ul className="recipe-lines">
        {rows.map((row, index) => (
          <li key={index}>
            <select value={row.ingredientId} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, ingredientId: event.target.value } : item)))} aria-label="Ingredient">
              <option value="">Choose ingredient…</option>
              {ingredients.data?.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
            </select>
            <div className="money-input">
              <span aria-hidden="true">₱</span>
              <input inputMode="decimal" value={row.unitCost} onChange={(event) => setRows(rows.map((item, i) => (i === index ? { ...item, unitCost: event.target.value.replace(/[^\d.]/g, '') } : item)))} aria-label="Unit cost" />
            </div>
            <span className="muted small">per {unitOf.get(row.ingredientId) ?? 'unit'}</span>
            <button type="button" className="icon-button" onClick={() => setRows(rows.filter((_, i) => i !== index))} aria-label="Remove">×</button>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="muted">No ingredients on this supplier’s price list yet.</p>}
      {duplicate && <p className="form-error small">Each ingredient can appear only once.</p>}
      {save.isError && <p className="form-error">{errorMessage(save.error)}</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={() => setRows([...rows, { ingredientId: '', unitCost: '' }])}>+ Add ingredient</button>
        <button
          type="button"
          className="button button-primary"
          disabled={!valid || save.isPending}
          onClick={() =>
            save.mutate(
              { id: supplier.id, items: rows.map((row) => ({ ingredientId: Number(row.ingredientId), unitCost: row.unitCost })) },
              { onSuccess: () => { toast(`Price list saved (${formatCount(rows.length)})`); onClose() } },
            )
          }
        >
          {save.isPending ? 'Saving…' : 'Save price list'}
        </button>
      </div>
    </div>
  )
}

const formatCount = (count: number) => `${count} item${count === 1 ? '' : 's'}`
