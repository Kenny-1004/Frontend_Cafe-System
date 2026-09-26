import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/cart/cart'
import { QuantityStepper } from '@/components/QuantityStepper'
import { defaultOption, type MenuItem } from '@/lib/menu'
import { formatCents, formatMoney, toCents } from '@/lib/money'

type Props = {
  item: MenuItem | null
  icon: string
  onClose: () => void
}

// Native <dialog>: focus trapping, Esc to close and the backdrop come from the browser
export function ProductDialog({ item, icon, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])

  return (
    <dialog
      ref={dialogRef}
      className="product-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose() // click on the backdrop
      }}
    >
      {item && <ProductForm key={item.key} item={item} icon={icon} onDone={onClose} />}
    </dialog>
  )
}

function ProductForm({ item, icon, onDone }: { item: MenuItem; icon: string; onDone: () => void }) {
  const cart = useCart()
  const [selectedId, setSelectedId] = useState(() => defaultOption(item).productId)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const selected = item.options.find((option) => option.productId === selectedId) ?? defaultOption(item)
  const sized = item.options.length > 1
  const cartFull = cart.isFull && !cart.lines.some((line) => line.productId === selected.productId && line.notes === notes.trim())

  const addToCart = () => {
    cart.add({
      productId: selected.productId,
      name: selected.productName,
      unitPrice: selected.price,
      quantity,
      notes: notes.trim(),
    })
    onDone()
  }

  return (
    <form
      method="dialog"
      className="dialog-body"
      onSubmit={(event) => {
        event.preventDefault()
        addToCart()
      }}
    >
      <div className="dialog-hero">
        <span aria-hidden="true">{icon}</span>
        <button type="button" className="dialog-close" onClick={onDone} aria-label="Close">
          ×
        </button>
      </div>

      <h2 className="dialog-title">{item.name}</h2>
      {item.description && <p className="dialog-description">{item.description}</p>}

      {sized && (
        <fieldset className="size-picker">
          <legend>Size</legend>
          <div className="size-options">
            {item.options.map((option) => (
              <label
                key={option.productId}
                className={`size-option${option.productId === selected.productId ? ' is-selected' : ''}${option.isAvailable ? '' : ' is-disabled'}`}
              >
                <input
                  type="radio"
                  name="size"
                  value={option.productId}
                  checked={option.productId === selected.productId}
                  disabled={!option.isAvailable}
                  onChange={() => setSelectedId(option.productId)}
                />
                <CupIcon oz={option.oz ?? 16} />
                <span className="size-label">{option.label}</span>
                <span className="size-oz">{option.oz} fl oz</span>
                <span className="size-price">{option.isAvailable ? formatMoney(option.price) : 'Sold out'}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="notes-field">
        <span>Special instructions <small>(optional)</small></span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={200}
          rows={2}
          placeholder={item.productType === 'prepared' ? 'e.g. less ice, less sweet' : 'e.g. please warm it up'}
        />
      </label>

      <div className="dialog-footer">
        <QuantityStepper value={quantity} onChange={setQuantity} label="Quantity" size="large" />
        <button type="submit" className="button button-primary" disabled={!selected.isAvailable || cartFull}>
          {cartFull ? 'Cart is full' : `Add · ${formatCents(toCents(selected.price) * quantity)}`}
        </button>
      </div>
    </form>
  )
}

// Cup outline that grows with the size, like the size picker at a coffee counter
function CupIcon({ oz }: { oz: number }) {
  const scale = 0.7 + ((oz - 12) / 12) * 0.3
  return (
    <svg className="size-cup" viewBox="0 0 24 32" style={{ transform: `scale(${scale})` }} aria-hidden="true">
      <path d="M3 6h18l-2.2 23a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 3.5h20v2.5H2z" fill="currentColor" />
    </svg>
  )
}
