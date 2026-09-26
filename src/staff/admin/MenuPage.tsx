import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/client'
import {
  useCategories,
  useCreateCategory,
  useIngredients,
  useProduct,
  useProducts,
  useSaveProduct,
  useSaveRecipe,
  useUpdateCategory,
  type ProductFilters,
} from '@/api/admin'
import type { AdminProduct, AdminProductDetail, ProductType } from '@/api/types'
import { formatMoney } from '@/lib/money'
import { Dialog } from '@/ui/Dialog'
import { Switch } from '@/ui/Switch'
import { formatQuantity } from '@/ui/format'
import { useDebounced } from '@/ui/useDebounced'
import { useToast } from '@/ui/toast'

const MONEY = /^\d{1,8}(\.\d{1,2})?$/
const QTY = /^\d{1,9}(\.\d{1,3})?$/

export function MenuPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [status, setStatus] = useState<ProductFilters['status']>('all')
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const categories = useCategories()
  const products = useProducts({ search: useDebounced(search.trim()) || undefined, categoryId, status })
  const save = useSaveProduct()
  const toast = useToast()

  const toggleActive = (product: AdminProduct, isActive: boolean) =>
    save.mutate(
      { id: product.id, isActive },
      {
        onSuccess: () => toast(`${product.name} ${isActive ? 'is back on the kiosk' : 'is hidden from the kiosk'}`),
        onError: (error) => toast(errorMessage(error), 'error'),
      },
    )

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Menu</h1>
          <p className="muted">Products, prices and recipes. Availability on the kiosk follows ingredient stock automatically.</p>
        </div>
        <div className="header-chips">
          <button type="button" className="button button-secondary" onClick={() => setCategoriesOpen(true)}>Categories</button>
          <button type="button" className="button button-primary" onClick={() => setEditing('new')}>+ New product</button>
        </div>
      </header>

      <div className="filter-bar">
        <input type="search" className="search-input" placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={categoryId ?? ''} onChange={(event) => setCategoryId(event.target.value ? Number(event.target.value) : undefined)} aria-label="Category">
          <option value="">All categories</option>
          {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <div className="segmented" role="radiogroup" aria-label="Visibility">
          {(['all', 'active', 'inactive'] as const).map((value) => (
            <button key={value} type="button" role="radio" aria-checked={status === value} className={status === value ? 'is-selected' : ''} onClick={() => setStatus(value)}>
              {value === 'all' ? 'All' : value === 'active' ? 'On kiosk' : 'Hidden'}
            </button>
          ))}
        </div>
        <span className="muted small">{products.data?.length ?? 0} products</span>
      </div>

      <section className="panel table-panel">
        {products.isError && <p className="form-error">{errorMessage(products.error)}</p>}
        <table className="data-table clickable">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Type</th><th className="num">Price</th><th>Recipe</th><th>Kiosk</th><th>Show</th></tr>
          </thead>
          <tbody>
            {(products.data ?? []).map((product) => (
              <tr key={product.id} onClick={() => setEditing(product.id)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setEditing(product.id)}>
                <td>
                  <strong>{product.name}</strong>
                  {product.description && <p className="muted small clamp-1">{product.description}</p>}
                </td>
                <td>{product.categoryName}</td>
                <td><span className="chip small">{product.productType === 'prepared' ? 'Made here' : 'Ready-made'}</span></td>
                <td className="num">{formatMoney(product.price)}</td>
                <td>{product.recipeLines > 0 ? `${product.recipeLines} ingredients` : <span className="muted">—</span>}</td>
                <td>
                  {!product.isActive ? <span className="status-pill status-pill-cancelled">Hidden</span>
                    : product.isAvailable ? <span className="status-pill status-pill-completed">Available</span>
                    : <span className="status-pill status-pill-unpaid">Sold out</span>}
                </td>
                <td><Switch checked={product.isActive} onChange={(value) => toggleActive(product, value)} label={`Show ${product.name} on the kiosk`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.isPending && <div className="skeleton-list">{[0, 1, 2, 3].map((key) => <div key={key} className="skeleton" />)}</div>}
        {products.data?.length === 0 && <div className="empty-state small"><p>No products match.</p></div>}
      </section>

      {editing !== null && <ProductDialog productId={editing} onClose={() => setEditing(null)} onCreated={(id) => setEditing(id)} />}
      <CategoriesDialog open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  )
}

function ProductDialog({ productId, onClose, onCreated }: { productId: number | 'new'; onClose: () => void; onCreated: (id: number) => void }) {
  const isNew = productId === 'new'
  const product = useProduct(isNew ? null : productId)

  return (
    <Dialog open onClose={onClose} title={isNew ? 'New product' : product.data?.name ?? 'Product'} size="large">
      {isNew ? (
        <ProductForm product={null} onClose={onClose} onCreated={onCreated} />
      ) : product.isPending ? (
        <div className="skeleton tall" />
      ) : product.isError ? (
        <p className="form-error">{errorMessage(product.error)}</p>
      ) : (
        <>
          {/* keyed by id: the form starts from the loaded product and keeps the user's edits */}
          <ProductForm key={product.data.id} product={product.data} onClose={onClose} onCreated={onCreated} />
          <RecipeEditor key={`recipe-${product.data.id}`} productId={product.data.id} productType={product.data.productType} initial={product.data.recipe} />
        </>
      )}
    </Dialog>
  )
}

function ProductForm({ product, onClose, onCreated }: { product: AdminProductDetail | null; onClose: () => void; onCreated: (id: number) => void }) {
  const categories = useCategories()
  const save = useSaveProduct()
  const toast = useToast()
  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product ? String(product.categoryId) : '',
    productType: product?.productType ?? ('prepared' as ProductType),
    price: product?.price ?? '',
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    isActive: product?.isActive ?? true,
  })
  // A new product defaults to the first category until one is picked
  const categoryId = form.categoryId || String(categories.data?.[0]?.id ?? '')
  const valid = form.name.trim() && categoryId && MONEY.test(form.price) && (!form.imageUrl || /^https?:\/\/\S+$/.test(form.imageUrl))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    save.mutate(
      {
        ...(product ? { id: product.id } : {}),
        name: form.name.trim(),
        categoryId: Number(categoryId),
        productType: form.productType,
        price: form.price,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        isActive: form.isActive,
      },
      {
        onSuccess: (saved) => {
          toast(product ? 'Product saved' : `${saved.name} created. Add its recipe below.`)
          if (!product) onCreated(saved.id)
        },
      },
    )
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field span-2">
        <span>Name</span>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} required placeholder="e.g. Caffe Latte (Grande 16oz)" />
      </label>
      <label className="field">
        <span>Category</span>
        <select value={categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Type</span>
        <select value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value as ProductType })}>
          <option value="prepared">Made here (uses a recipe)</option>
          <option value="ready_made">Ready-made (bought in)</option>
        </select>
      </label>
      <label className="field">
        <span>Price</span>
        <div className="money-input">
          <span aria-hidden="true">₱</span>
          <input inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" />
        </div>
        {form.price && !MONEY.test(form.price) && <small className="field-error">Use an amount like 150 or 150.50</small>}
      </label>
      <label className="field toggle-field">
        <span>Show on the kiosk</span>
        <Switch checked={form.isActive} onChange={(value) => setForm({ ...form, isActive: value })} label="Show on the kiosk" />
      </label>
      <label className="field span-2">
        <span>Description <small>(optional)</small></span>
        <textarea rows={2} maxLength={300} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </label>
      <label className="field span-2">
        <span>Image URL <small>(optional)</small></span>
        <input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" />
      </label>
      {save.isError && <p className="form-error span-2">{errorMessage(save.error)}</p>}
      <div className="form-actions span-2">
        <button type="button" className="button button-secondary" onClick={onClose}>Close</button>
        <button type="submit" className="button button-primary" disabled={!valid || save.isPending}>
          {save.isPending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </div>
    </form>
  )
}

type Line = { ingredientId: string; quantity: string }

function RecipeEditor({ productId, productType, initial }: { productId: number; productType: ProductType; initial: { ingredientId: number; quantity: string }[] }) {
  const ingredients = useIngredients({ status: 'all' })
  const saveRecipe = useSaveRecipe()
  const toast = useToast()
  const [lines, setLines] = useState<Line[]>(() => initial.map((line) => ({ ingredientId: String(line.ingredientId), quantity: String(Number(line.quantity)) })))
  const byId = new Map((ingredients.data ?? []).map((ingredient) => [String(ingredient.id), ingredient]))

  const ids = lines.map((line) => line.ingredientId)
  const duplicate = ids.some((id, index) => id && ids.indexOf(id) !== index)
  const valid = !duplicate && lines.every((line) => line.ingredientId && QTY.test(line.quantity) && Number(line.quantity) > 0)

  const save = () =>
    saveRecipe.mutate(
      { id: productId, lines: lines.map((line) => ({ ingredientId: Number(line.ingredientId), quantity: line.quantity })) },
      { onSuccess: () => toast('Recipe saved'), onError: (error) => toast(errorMessage(error), 'error') },
    )

  return (
    <section className="recipe-editor">
      <div className="panel-title-row">
        <h3 className="section-title">Recipe · per serving</h3>
        <span className="muted small">
          {productType === 'ready_made'
            ? 'Optional for ready-made items: add one stock item (e.g. 1 bottle) to track it.'
            : 'Stock is deducted when the order is paid.'}
        </span>
      </div>
      {lines.length === 0 && <p className="muted">No ingredients. This product is always available while shown.</p>}
      <ul className="recipe-lines">
        {lines.map((line, index) => {
          const ingredient = byId.get(line.ingredientId)
          return (
            <li key={index}>
              <select
                value={line.ingredientId}
                onChange={(event) => setLines(lines.map((row, i) => (i === index ? { ...row, ingredientId: event.target.value } : row)))}
                aria-label="Ingredient"
              >
                <option value="">Choose ingredient…</option>
                {ingredients.data?.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}{option.isActive ? '' : ' (inactive)'}</option>
                ))}
              </select>
              <div className="qty-input">
                <input
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(event) => setLines(lines.map((row, i) => (i === index ? { ...row, quantity: event.target.value.replace(/[^\d.]/g, '') } : row)))}
                  aria-label="Quantity per serving"
                />
                <span>{ingredient?.unit ?? ''}</span>
              </div>
              <span className="muted small recipe-stock">{ingredient ? `${formatQuantity(ingredient.stockQty)} ${ingredient.unit} in stock` : ''}</span>
              <button type="button" className="icon-button" onClick={() => setLines(lines.filter((_, i) => i !== index))} aria-label="Remove ingredient">×</button>
            </li>
          )
        })}
      </ul>
      {duplicate && <p className="form-error small">Each ingredient can appear only once.</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={() => setLines([...lines, { ingredientId: '', quantity: '' }])} disabled={lines.length >= 30}>
          + Add ingredient
        </button>
        <button type="button" className="button button-primary" onClick={save} disabled={!valid || saveRecipe.isPending}>
          {saveRecipe.isPending ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </section>
  )
}

function CategoriesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const toast = useToast()
  const [name, setName] = useState('')
  const [drafts, setDrafts] = useState<Record<number, { name: string; sortOrder: string }>>({})

  const add = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate({ name: name.trim() }, { onSuccess: () => { setName(''); toast('Category added') }, onError: (error) => toast(errorMessage(error), 'error') })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Categories" size="medium">
      <p className="muted small">Kiosk tabs appear in sort order (lowest first).</p>
      <table className="data-table compact">
        <thead><tr><th>Name</th><th className="num">Sort</th><th className="num">Products</th><th /></tr></thead>
        <tbody>
          {categories.data?.map((category) => {
            const draft = drafts[category.id] ?? { name: category.name, sortOrder: String(category.sortOrder) }
            const changed = draft.name !== category.name || draft.sortOrder !== String(category.sortOrder)
            return (
              <tr key={category.id}>
                <td><input value={draft.name} maxLength={80} onChange={(event) => setDrafts({ ...drafts, [category.id]: { ...draft, name: event.target.value } })} aria-label="Category name" /></td>
                <td className="num"><input className="narrow" inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDrafts({ ...drafts, [category.id]: { ...draft, sortOrder: event.target.value.replace(/\D/g, '') } })} aria-label="Sort order" /></td>
                <td className="num">{category.productCount}</td>
                <td>
                  <button
                    type="button"
                    className="button button-secondary small"
                    disabled={!changed || !draft.name.trim() || draft.sortOrder === '' || update.isPending}
                    onClick={() =>
                      update.mutate(
                        { id: category.id, name: draft.name.trim(), sortOrder: Number(draft.sortOrder) },
                        { onSuccess: () => toast('Category saved'), onError: (error) => toast(errorMessage(error), 'error') },
                      )
                    }
                  >
                    Save
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={add}>
        <input placeholder="New category name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        <button type="submit" className="button button-primary" disabled={!name.trim() || create.isPending}>Add</button>
      </form>
    </Dialog>
  )
}
