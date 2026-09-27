import { useState, type CSSProperties } from 'react'
import type { MenuItem } from '@/lib/menu'
import { formatMoney } from '@/lib/money'

type Props = {
  item: MenuItem
  icon: string
  photo: string
  index: number
  onSelect: (item: MenuItem) => void
}

export function ProductCard({ item, icon, photo, index, onSelect }: Props) {
  const sized = item.options.length > 1
  const [photoFailed, setPhotoFailed] = useState(false)
  const src = item.imageUrl ?? photo

  return (
    <button
      type="button"
      className={`product-card${item.isAvailable ? '' : ' is-sold-out'}`}
      // Cards rise in one after another; capped so long categories don't wait
      style={{ '--i': Math.min(index, 12) } as CSSProperties}
      onClick={() => onSelect(item)}
      disabled={!item.isAvailable}
    >
      <div className="product-image">
        {photoFailed ? (
          <span aria-hidden="true">{icon}</span>
        ) : (
          <img src={src} alt="" loading="lazy" decoding="async" onError={() => setPhotoFailed(true)} />
        )}
        {!item.isAvailable && <span className="badge badge-sold-out">Sold out</span>}
        {sized && item.isAvailable && <span className="badge badge-sizes">{item.options.length} sizes</span>}
      </div>
      <div className="product-body">
        <h3 className="product-name">{item.name}</h3>
        {item.description && <p className="product-description">{item.description}</p>}
        <div className="product-footer">
          <p className="product-price">
            {sized && <span className="price-from">from </span>}
            {formatMoney(item.fromPrice)}
          </p>
          {item.isAvailable && (
            <span className="product-add" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
