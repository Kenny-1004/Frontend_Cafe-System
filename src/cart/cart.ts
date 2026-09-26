import { createContext, useContext } from 'react'
import type { ServiceType } from '@/api/types'

// Limits match the backend validation (1-30 lines, quantity 1-50)
export const MAX_LINES = 30
export const MAX_QUANTITY = 50

export type CartLine = {
  key: string
  productId: number
  name: string
  unitPrice: string
  quantity: number
  notes: string
}

export type CartState = {
  lines: CartLine[]
  serviceType: ServiceType
}

type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'key'> }
  | { type: 'setQuantity'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'setServiceType'; serviceType: ServiceType }
  | { type: 'clear' }

const clampQuantity = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, quantity))

// Same product with the same notes is one line; different notes stay separate lines
const lineKey = (productId: number, notes: string) => `${productId}|${notes}`

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.line.productId, action.line.notes)
      const existing = state.lines.find((line) => line.key === key)
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.key === key ? { ...line, quantity: clampQuantity(line.quantity + action.line.quantity) } : line,
          ),
        }
      }
      if (state.lines.length >= MAX_LINES) return state
      return { ...state, lines: [...state.lines, { ...action.line, key, quantity: clampQuantity(action.line.quantity) }] }
    }
    case 'setQuantity':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.key === action.key ? { ...line, quantity: clampQuantity(action.quantity) } : line,
        ),
      }
    case 'remove':
      return { ...state, lines: state.lines.filter((line) => line.key !== action.key) }
    case 'setServiceType':
      return { ...state, serviceType: action.serviceType }
    case 'clear':
      return { lines: [], serviceType: 'dine_in' }
  }
}

export type CartContextValue = CartState & {
  itemCount: number
  totalCents: number
  isFull: boolean
  add: (line: Omit<CartLine, 'key'>) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  setServiceType: (serviceType: ServiceType) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
