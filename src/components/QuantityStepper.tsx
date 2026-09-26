import { MAX_QUANTITY } from '@/cart/cart'

type Props = {
  value: number
  onChange: (value: number) => void
  label: string
  size?: 'small' | 'large'
}

export function QuantityStepper({ value, onChange, label, size = 'small' }: Props) {
  return (
    <div className={`stepper stepper-${size}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        −
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QUANTITY} aria-label="Increase quantity">
        +
      </button>
    </div>
  )
}
