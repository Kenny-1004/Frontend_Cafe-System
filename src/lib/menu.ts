import type { MenuProduct } from '@/api/types'
import { toCents } from '@/lib/money'

// The backend stores each drink size as its own product, e.g. "Caffe Latte (Grande 16oz)".
// The kiosk shows one card per drink and lets the customer pick the size.
const SIZED_NAME = /^(.+) \((Tall|Grande|Venti) (\d+)oz\)$/

export type SizeOption = {
  productId: number
  productName: string // full backend name, shown on the cart and receipt
  label: string // "Tall", "Grande", "Venti", or "Regular" for single-size items
  oz: number | null
  price: string
  isAvailable: boolean
}

export type MenuItem = {
  key: string
  name: string
  description: string | null
  productType: MenuProduct['productType']
  imageUrl: string | null
  options: SizeOption[]
  isAvailable: boolean
  fromPrice: string
}

export function groupProducts(products: MenuProduct[]): MenuItem[] {
  const items = new Map<string, MenuItem>()

  for (const product of products) {
    const match = SIZED_NAME.exec(product.name)
    const name = match ? match[1] : product.name
    const option: SizeOption = {
      productId: product.id,
      productName: product.name,
      label: match ? match[2] : 'Regular',
      oz: match ? Number(match[3]) : null,
      price: product.price,
      isAvailable: product.isAvailable,
    }

    const item = items.get(name)
    if (item) {
      item.options.push(option)
    } else {
      items.set(name, {
        key: name,
        name,
        description: product.description,
        productType: product.productType,
        imageUrl: product.imageUrl,
        options: [option],
        isAvailable: false,
        fromPrice: product.price,
      })
    }
  }

  for (const item of items.values()) {
    item.options.sort((a, b) => (a.oz ?? 0) - (b.oz ?? 0))
    item.isAvailable = item.options.some((option) => option.isAvailable)
    const priced = item.options.filter((option) => option.isAvailable)
    const candidates = priced.length > 0 ? priced : item.options
    item.fromPrice = candidates.reduce((min, option) =>
      toCents(option.price) < toCents(min.price) ? option : min,
    ).price
  }

  return [...items.values()]
}

// Grande is the default size when it can be ordered
export function defaultOption(item: MenuItem): SizeOption {
  return (
    item.options.find((option) => option.label === 'Grande' && option.isAvailable) ??
    item.options.find((option) => option.isAvailable) ??
    item.options[0]
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  'Espresso Bar': '☕',
  'Hot Coffee': '☕',
  'Iced Coffee': '🧊',
  Frappes: '🥤',
  'Matcha & Tea': '🍵',
  'Milk Tea': '🧋',
  Chocolate: '🍫',
  Refreshers: '🍓',
  'Juices & Shakes': '🍹',
  'Bottled Drinks': '💧',
  'Pastries & Breads': '🥐',
  'Cakes & Desserts': '🍰',
  Sandwiches: '🥪',
}

export const categoryIcon = (categoryName: string) => CATEGORY_ICONS[categoryName] ?? '☕'
