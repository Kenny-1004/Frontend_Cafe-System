import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { kioskKeys, useMenu } from '@/api/kiosk'
import { useEventStream } from '@/realtime/useEventStream'
import { useCart } from '@/cart/cart'
import { CartPanel } from '@/components/CartPanel'
import { ProductCard } from '@/components/ProductCard'
import { ProductDialog } from '@/components/ProductDialog'
import { categoryIcon, groupProducts, type MenuItem } from '@/lib/menu'
import { formatCents } from '@/lib/money'

export function MenuPage() {
  const menu = useMenu()
  const cart = useCart()
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const queryClient = useQueryClient()

  // Stock changes (a sale, a delivery, waste) can make items sell out or come back.
  // Bursts of events (one per ingredient) collapse into a single menu refresh.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEventStream('/menu/events', {
    onEvent: () => {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => void queryClient.invalidateQueries({ queryKey: kioskKeys.menu }), 500)
    },
  })

  const categories = useMemo(
    () =>
      (menu.data ?? [])
        .filter((category) => category.products.length > 0)
        .map((category) => ({ ...category, items: groupProducts(category.products) })),
    [menu.data],
  )

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0]

  if (menu.isPending) {
    return (
      <main className="page-state">
        <div className="spinner" aria-hidden="true" />
        <p>Loading the menu…</p>
      </main>
    )
  }

  if (menu.isError) {
    return (
      <main className="page-state">
        <p className="page-state-title">We couldn’t load the menu.</p>
        <p className="muted">{menu.error.message}</p>
        <button type="button" className="button button-primary" onClick={() => void menu.refetch()}>
          Try again
        </button>
      </main>
    )
  }

  if (!activeCategory) {
    return (
      <main className="page-state">
        <p className="page-state-title">The menu is empty.</p>
        <p className="muted">Ask a staff member to add products.</p>
      </main>
    )
  }

  const icon = categoryIcon(activeCategory.name)

  return (
    <div className="menu-layout">
      <main className="menu-main">
        <nav className="category-tabs" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={category.id === activeCategory.id ? 'is-active' : ''}
              aria-current={category.id === activeCategory.id ? 'true' : undefined}
              onClick={() => setActiveCategoryId(category.id)}
            >
              <span aria-hidden="true">{categoryIcon(category.name)}</span> {category.name}
            </button>
          ))}
        </nav>

        <section className="category-section" aria-labelledby="category-title">
          <div className="category-heading">
            <h1 id="category-title">{activeCategory.name}</h1>
            <p className="muted">
              {activeCategory.items.length} items
              {menu.isFetching && <span className="refreshing"> · refreshing…</span>}
            </p>
          </div>
          <div className="product-grid">
            {activeCategory.items.map((item) => (
              <ProductCard key={item.key} item={item} icon={icon} onSelect={setSelectedItem} />
            ))}
          </div>
        </section>
      </main>

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      {cartOpen && <div className="cart-scrim" onClick={() => setCartOpen(false)} aria-hidden="true" />}

      {cart.itemCount > 0 && !cartOpen && (
        <button type="button" className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-bar-count">{cart.itemCount}</span>
          <span>View order</span>
          <strong>{formatCents(cart.totalCents)}</strong>
        </button>
      )}

      <ProductDialog item={selectedItem} icon={icon} onClose={() => setSelectedItem(null)} />
    </div>
  )
}
