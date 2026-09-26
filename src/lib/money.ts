// Money arrives as decimal strings ("160.00"). Arithmetic is done in whole centavos
// so totals never pick up floating-point errors; the backend total is always authoritative.

export function toCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
}

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
})

export const formatCents = (cents: number) => peso.format(cents / 100)

export const formatMoney = (amount: string) => formatCents(toCents(amount))
