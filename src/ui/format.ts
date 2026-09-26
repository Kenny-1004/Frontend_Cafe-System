const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const time = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })
const dateOnly = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'UTC' })
const number = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 })

export const formatDateTime = (value: string | null) => (value ? dateTime.format(new Date(value)) : '—')
export const formatTime = (value: string | null) => (value ? time.format(new Date(value)) : '—')
// Business dates are café-local 'YYYY-MM-DD' strings: format them without shifting time zones
export const formatDate = (value: string | null) => (value ? dateOnly.format(new Date(`${value}T00:00:00Z`)) : '—')
export const formatQuantity = (value: string | number) => number.format(Number(value))

// "3 min", "1 h 5 min" since a timestamp
export function elapsed(since: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
