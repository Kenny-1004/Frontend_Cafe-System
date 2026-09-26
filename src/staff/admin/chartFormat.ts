import { formatCents, toCents } from '@/lib/money'

const compact = new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 })

// Chart geometry needs numbers; labels still come from exact centavo formatting
export const pesoNumber = (amount: string) => toCents(amount) / 100
export const formatPesoNumber = (value: number) => formatCents(Math.round(value * 100))
export const formatPesoTick = (value: number) => `₱${compact.format(value)}`

const weekday = new Intl.DateTimeFormat('en-PH', { weekday: 'short', timeZone: 'UTC' })
const dayMonth = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' })
export const shortDay = (date: string) => weekday.format(new Date(`${date}T00:00:00Z`))
export const shortDate = (date: string) => dayMonth.format(new Date(`${date}T00:00:00Z`))

export const hourLabel = (hour: number) => (hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`)
