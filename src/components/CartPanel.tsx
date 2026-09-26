import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '@/api/client'
import { useMenu, usePlaceOrder } from '@/api/kiosk'
import type { ServiceType } from '@/api/types'
import { useCart } from '@/cart/cart'
import { QuantityStepper } from '@/components/QuantityStepper'
import { formatCents, toCents } from '@/lib/money'
import { uuid } from '@/lib/uuid'

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'dine_in', label: 'Dine in' },
  { value: 'take_out', label: 'Take out' },
]

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function CartPanel({ isOpen, onClose }: Props) {
  const cart = useCart()
  const navigate = useNavigate()
  const menu = useMenu()
  const placeOrder = usePlaceOrder()

  // Flag cart lines that sold out after they were added (the menu refreshes in the background)
  const soldOut = useMemo(() => {
    const ids = new Set<number>()
    for (const category of menu.data ?? []) {
      for (const product of category.products) if (!product.isAvailable) ids.add(product.id)
    }
    return ids
  }, [menu.data])

  const hasSoldOutLine = cart.lines.some((line) => soldOut.has(line.productId))

  // One key per checkout: a retry of the same cart reuses it (no duplicate order);
  // changing the cart starts a new checkout with a new key.
  const cartSignature = `${cart.serviceType}|${cart.lines.map((line) => `${line.key}x${line.quantity}`).join(',')}`
  const idempotencyKey = useMemo(() => uuid(), [cartSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    placeOrder.mutate(
      {
        idempotencyKey,
        input: {
          serviceType: cart.serviceType,
          items: cart.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            ...(line.notes ? { notes: line.notes } : {}),
          })),
        },
      },
      {
        onSuccess: (order) => {
          cart.clear()
          navigate(`/orders/${order.publicId}`)
        },
      },
    )
  }

  return (
    <aside className={`cart${isOpen ? ' is-open' : ''}`} aria-label="Your order">
      <div className="cart-header">
        <h2>Your order</h2>
        <button type="button" className="cart-close" onClick={onClose} aria-label="Close cart">
          ×
        </button>
      </div>

      {cart.lines.length === 0 ? (
        <div className="cart-empty">
          <span aria-hidden="true">🛒</span>
          <p>Your cart is empty.</p>
          <p className="muted">Tap a drink or treat to get started.</p>
        </div>
      ) : (
        <ul className="cart-lines">
          {cart.lines.map((line) => (
            <li key={line.key} className={`cart-line${soldOut.has(line.productId) ? ' is-sold-out' : ''}`}>
              <div className="cart-line-info">
                <p className="cart-line-name">{line.name}</p>
                {line.notes && <p className="cart-line-notes">“{line.notes}”</p>}
                {soldOut.has(line.productId) && <p className="cart-line-warning">Just sold out. Please remove it.</p>}
                <button type="button" className="link-button" onClick={() => cart.remove(line.key)}>
                  Remove
                </button>
              </div>
              <div className="cart-line-side">
                <p className="cart-line-price">{formatCents(toCents(line.unitPrice) * line.quantity)}</p>
                <QuantityStepper
                  value={line.quantity}
                  onChange={(quantity) => cart.setQuantity(line.key, quantity)}
                  label={`Quantity of ${line.name}`}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="cart-footer">
        <div className="service-toggle" role="radiogroup" aria-label="Dine in or take out">
          {SERVICE_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={cart.serviceType === option.value}
              className={cart.serviceType === option.value ? 'is-selected' : ''}
              onClick={() => cart.setServiceType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="cart-total">
          <span>Total</span>
          <strong>{formatCents(cart.totalCents)}</strong>
        </div>

        {placeOrder.isError && <p className="form-error" role="alert">{describeError(placeOrder.error)}</p>}

        <button
          type="button"
          className="button button-primary button-block"
          onClick={submit}
          disabled={cart.lines.length === 0 || hasSoldOutLine || placeOrder.isPending}
        >
          {placeOrder.isPending ? 'Placing order…' : 'Place order'}
        </button>
        <p className="cart-hint muted">You’ll pay at the counter using your order number.</p>
      </div>
    </aside>
  )
}

function describeError(error: Error) {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  if (error.code === 'PRODUCT_UNAVAILABLE') {
    return 'Some items just sold out. The menu has been refreshed, so please check your order.'
  }
  if (error.details.length > 0) return error.details.map((detail) => detail.message).join('. ')
  return error.message
}
