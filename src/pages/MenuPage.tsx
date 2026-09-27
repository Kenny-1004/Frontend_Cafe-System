import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { kioskKeys, useMenu } from '@/api/kiosk'
import { useEventStream } from '@/realtime/useEventStream'
import { useCart } from '@/cart/cart'
import { CartPanel } from '@/components/CartPanel'
import { ProductCard } from '@/components/ProductCard'
import { ProductDialog } from '@/components/ProductDialog'
import { categoryIcon, categoryPhoto, groupProducts, type MenuItem } from '@/lib/menu'
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
  const photo = categoryPhoto(activeCategory.name)

  const selectCategory = (id: number) => {
    setActiveCategoryId(id)
    // Start the new category from its banner rather than mid-way down the old list
    const main = document.querySelector('.menu-main')
    if (main && main.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    }
  }

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
              onClick={() => selectCategory(category.id)}
            >
              <img className="tab-thumb" src={categoryPhoto(category.name).src} alt="" loading="lazy" decoding="async" />
              {category.name}
            </button>
          ))}
        </nav>

        <section className="category-section" aria-labelledby="category-title">
          {/* Keyed by category so the banner and cards replay their entrance on every switch */}
          <header key={activeCategory.id} className="category-banner">
            <img src={photo.src} alt="" decoding="async" />
            <div className="category-banner-text">
              <p className="category-count">
                {activeCategory.items.length} items
                {menu.isFetching && <span className="refreshing"> · refreshing…</span>}
              </p>
              <h1 id="category-title">{activeCategory.name}</h1>
              <p className="category-blurb">{photo.blurb}</p>
            </div>
          </header>
          <div key={`grid-${activeCategory.id}`} className="product-grid">
            {activeCategory.items.map((item, index) => (
              <ProductCard key={item.key} item={item} icon={icon} photo={photo.src} index={index} onSelect={setSelectedItem} />
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

      <ProductDialog item={selectedItem} icon={icon} photo={photo.src} onClose={() => setSelectedItem(null)} />
    </div>
  )
}
