import { useMemo, useReducer, type ReactNode } from 'react'
import { CartContext, cartReducer, MAX_LINES, type CartContextValue } from '@/cart/cart'
import { toCents } from '@/lib/money'

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { lines: [], serviceType: 'dine_in' })

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      itemCount: state.lines.reduce((sum, line) => sum + line.quantity, 0),
      totalCents: state.lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0),
      isFull: state.lines.length >= MAX_LINES,
      add: (line) => dispatch({ type: 'add', line }),
      setQuantity: (key, quantity) => dispatch({ type: 'setQuantity', key, quantity }),
      remove: (key) => dispatch({ type: 'remove', key }),
      setServiceType: (serviceType) => dispatch({ type: 'setServiceType', serviceType }),
      clear: () => dispatch({ type: 'clear' }),
    }),
    [state],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
