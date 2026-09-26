import type { MenuItem } from '@/lib/menu'
import { formatMoney } from '@/lib/money'

type Props = {
  item: MenuItem
  icon: string
  onSelect: (item: MenuItem) => void
}

export function ProductCard({ item, icon, onSelect }: Props) {
  const sized = item.options.length > 1

  return (
    <button
      type="button"
      className={`product-card${item.isAvailable ? '' : ' is-sold-out'}`}
      onClick={() => onSelect(item)}
      disabled={!item.isAvailable}
    >
      <div className="product-image">
        {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <span aria-hidden="true">{icon}</span>}
        {!item.isAvailable && <span className="badge badge-sold-out">Sold out</span>}
      </div>
      <div className="product-body">
        <h3 className="product-name">{item.name}</h3>
        {item.description && <p className="product-description">{item.description}</p>}
        <p className="product-price">
          {sized && <span className="price-from">from </span>}
          {formatMoney(item.fromPrice)}
          {sized && <span className="product-sizes"> · {item.options.length} sizes</span>}
        </p>
      </div>
    </button>
  )
}
