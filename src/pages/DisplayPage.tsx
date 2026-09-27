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
  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  // Chime when an order number joins the Ready column (not on first load)
  const known = useRef<Set<number> | null>(null)
  const data = display.data
  useEffect(() => {
    if (!data) return
    const current = new Set(data.ready.map((order) => order.orderNumber))
    const previous = known.current
    if (previous && soundRef.current && [...current].some((number) => !previous.has(number))) {
      playChime([659.25, 880, 1046.5])
    }
    known.current = current
  }, [data])

  const stream = useEventStream('/display/events', {
    onEvent: () => void queryClient.invalidateQueries({ queryKey: displayKeys.board }),
    onConnect: () => void queryClient.invalidateQueries({ queryKey: displayKeys.board }),
  })

  const preparing = data?.preparing ?? []
  const ready = data?.ready ?? []

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
            isNew={(order) => now - Date.parse(order.since) < HIGHLIGHT_MS}
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
