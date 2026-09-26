import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { displayKeys, useDisplay, type DisplayOrder } from '@/api/display'
import { BrandMark } from '@/components/Header'
import { useEventStream } from '@/realtime/useEventStream'
import { playChime } from '@/ui/chime'
import { useNow } from '@/ui/useNow'

const HIGHLIGHT_MS = 20_000
const clock = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })

// Public "now serving" screen for a TV at the counter. No login; it shows only
// order numbers and first names, which are called out loud anyway.
export function DisplayPage() {
  const queryClient = useQueryClient()
  const display = useDisplay()
  const now = useNow(1_000)
  const [sound, setSound] = useState(false)
  const soundRef = useRef(sound)
  soundRef.current = sound

  // When an order turns ready: remember when, so it glows for a while, and chime
  const readySince = useRef(new Map<number, number>())
  const known = useRef<Set<number> | null>(null)
  const ready = display.data?.ready ?? []
  useEffect(() => {
    const current = new Set(ready.map((order) => order.orderNumber))
    if (known.current) {
      const fresh = [...current].filter((number) => !known.current!.has(number))
      fresh.forEach((number) => readySince.current.set(number, Date.now()))
      if (fresh.length > 0 && soundRef.current) playChime([659.25, 880, 1046.5])
    }
    known.current = current
  }, [ready])

  const stream = useEventStream('/display/events', {
    onEvent: () => void queryClient.invalidateQueries({ queryKey: displayKeys.board }),
    onConnect: () => void queryClient.invalidateQueries({ queryKey: displayKeys.board }),
  })

  const preparing = display.data?.preparing ?? []

  return (
    <div className="display-page">
      <header className="display-header">
        <div className="display-brand">
          <BrandMark />
          <span>Campus Café</span>
        </div>
        <p className="display-hint">Listen for your number and name</p>
        <div className="display-tools">
          <button type="button" className={`display-sound${sound ? ' is-on' : ''}`} onClick={() => setSound(!sound)}>
            {sound ? '🔔 Sound on' : '🔕 Tap for sound'}
          </button>
          <span className="display-clock">{clock.format(now)}</span>
          {stream !== 'live' && <span className="display-offline">Reconnecting…</span>}
        </div>
      </header>

      <main className="display-columns">
        <section className="display-column preparing" aria-labelledby="display-preparing">
          <h1 id="display-preparing">
            Preparing <span className="display-count">{preparing.length}</span>
          </h1>
          <OrderGrid orders={preparing} empty="No orders being made right now." />
        </section>

        <section className="display-column ready" aria-labelledby="display-ready" aria-live="polite">
          <h1 id="display-ready">
            Ready for pick-up <span className="display-count">{ready.length}</span>
          </h1>
          <OrderGrid
            orders={ready}
            empty="Ready orders appear here."
            isNew={(order) => now - (readySince.current.get(order.orderNumber) ?? 0) < HIGHLIGHT_MS}
          />
        </section>
      </main>

      {display.isError && <p className="display-error">Can’t reach the café server. Retrying…</p>}
    </div>
  )
}

function OrderGrid({ orders, empty, isNew }: { orders: DisplayOrder[]; empty: string; isNew?: (order: DisplayOrder) => boolean }) {
  if (orders.length === 0) return <p className="display-empty">{empty}</p>
  return (
    <ul className="display-grid">
      {orders.map((order) => (
        <li key={order.orderNumber} className={`display-ticket${isNew?.(order) ? ' is-new' : ''}`}>
          <span className="display-number">{order.orderNumber}</span>
          <span className="display-name">{order.name}</span>
        </li>
      ))}
    </ul>
  )
}
