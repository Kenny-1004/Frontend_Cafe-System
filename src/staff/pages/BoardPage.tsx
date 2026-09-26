import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/client'
import { boardKeys, useBoard, useCompleteOrders, useServeOrder } from '@/api/staff'
import type { BoardCard, OrderStatusEvent } from '@/api/types'
import { useEventStream } from '@/realtime/useEventStream'
import { LiveIndicator } from '@/staff/LiveIndicator'
import { playChime } from '@/ui/chime'
import { elapsed } from '@/ui/format'
import { useToast } from '@/ui/toast'
import { useNow } from '@/ui/useNow'

const LATE_MINUTES = 10

function readPref(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writePref(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // preferences are optional
  }
}

export function BoardPage() {
  const queryClient = useQueryClient()
  const board = useBoard()
  const now = useNow(15_000)
  const [muted, setMuted] = useState(() => readPref('board.muted'))
  const [focus, setFocus] = useState(() => readPref('board.focus'))

  const stream = useEventStream('/board/events', {
    onEvent: (event, data) => {
      if (event !== 'order.status') return
      void queryClient.invalidateQueries({ queryKey: boardKeys.board })
      if ((data as OrderStatusEvent).status === 'pending' && !muted) playChime([523.25, 659.25, 783.99]) // new order to make
    },
    onConnect: () => void queryClient.invalidateQueries({ queryKey: boardKeys.board }),
  })

  // Focus mode hides the sidebar for a wall-mounted screen
  useEffect(() => {
    document.documentElement.classList.toggle('board-focus', focus)
    return () => document.documentElement.classList.remove('board-focus')
  }, [focus])

  const pending = board.data?.pending ?? []
  const serving = board.data?.serving ?? []

  return (
    <div className="staff-page board-page">
      <header className="staff-page-header">
        <div>
          <h1>Orders board</h1>
          <p className="muted">First paid, first made. Press Done when a drink is ready to call out.</p>
        </div>
        <div className="header-chips">
          <button type="button" className="chip-button" onClick={() => { setMuted(!muted); writePref('board.muted', !muted) }}>
            {muted ? '🔇 Sound off' : '🔔 Sound on'}
          </button>
          <button type="button" className="chip-button" onClick={() => { setFocus(!focus); writePref('board.focus', !focus) }}>
            {focus ? '↙ Exit full screen' : '↗ Full screen'}
          </button>
          <LiveIndicator state={stream} />
        </div>
      </header>

      {board.isError && <p className="form-error">{errorMessage(board.error)}</p>}

      <div className="board-columns">
        <section className="board-column" aria-labelledby="pending-title">
          <div className="board-column-header pending">
            <h2 id="pending-title">Preparing</h2>
            <span className="count-badge">{pending.length}</span>
          </div>
          {board.isPending ? (
            <div className="skeleton-list">{[0, 1].map((key) => <div key={key} className="skeleton tall" />)}</div>
          ) : pending.length === 0 ? (
            <div className="empty-state small"><span aria-hidden="true">✨</span><p>All caught up. New paid orders appear here.</p></div>
          ) : (
            <div className="card-grid">
              {pending.map((card) => <PendingCard key={card.id} card={card} now={now} />)}
            </div>
          )}
        </section>

        <ServingColumn cards={serving} now={now} loading={board.isPending} />
      </div>
    </div>
  )
}

function PendingCard({ card, now }: { card: BoardCard; now: number }) {
  const serve = useServeOrder()
  const toast = useToast()
  const minutes = (now - new Date(card.paidAt).getTime()) / 60_000
  const prepared = card.items.filter((item) => item.prepared)
  const handOver = card.items.filter((item) => !item.prepared)

  return (
    <article className={`order-card${minutes >= LATE_MINUTES ? ' is-late' : ''}`}>
      <header className="order-card-header">
        <span className="order-card-number">#{card.orderNumber}</span>
        <div className="order-card-who">
          <strong>{card.customerName}</strong>
          <span className="chip small">{card.serviceType === 'take_out' ? 'Take out' : 'Dine in'}</span>
        </div>
        <span className="order-card-timer" title="Time since payment">⏱ {elapsed(card.paidAt, now)}</span>
      </header>

      {prepared.length > 0 && (
        <ul className="make-list">
          {prepared.map((item, index) => (
            <li key={index}>
              <span className="make-qty">{item.quantity}×</span>
              <span>
                {item.name}
                {item.notes && <em className="make-notes">{item.notes}</em>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {handOver.length > 0 && (
        <div className="handover">
          <p className="handover-label">Hand over</p>
          <ul>
            {handOver.map((item, index) => (
              <li key={index}>{item.quantity}× {item.name}{item.notes && <em className="make-notes"> {item.notes}</em>}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="button button-primary button-block"
        disabled={serve.isPending}
        onClick={() =>
          serve.mutate(card.id, {
            onSuccess: () => toast(`Call out: order #${card.orderNumber} for ${card.customerName}!`, 'info'),
            onError: (error) => toast(errorMessage(error), 'error'),
          })
        }
      >
        {serve.isPending ? 'Marking ready…' : 'Done · call out'}
      </button>
    </article>
  )
}

function ServingColumn({ cards, now, loading }: { cards: BoardCard[]; now: number; loading: boolean }) {
  const complete = useCompleteOrders()
  const toast = useToast()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Drop selections for cards that left the column (picked up elsewhere, expired)
  const visibleSelected = [...selected].filter((id) => cards.some((card) => card.id === id))

  const clear = (ids: number[]) =>
    complete.mutate(ids, {
      onSuccess: ({ cleared }) => {
        setSelected(new Set())
        if (cleared > 0) toast(`${cleared} order${cleared === 1 ? '' : 's'} picked up`)
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    })

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section className="board-column serving-column" aria-labelledby="serving-title">
      <div className="board-column-header serving">
        <h2 id="serving-title">Ready for pick-up</h2>
        <span className="count-badge">{cards.length}</span>
        {visibleSelected.length > 0 && (
          <button type="button" className="chip-button" onClick={() => clear(visibleSelected)} disabled={complete.isPending}>
            Clear {visibleSelected.length} selected
          </button>
        )}
      </div>
      {loading ? (
        <div className="skeleton-list"><div className="skeleton" /></div>
      ) : cards.length === 0 ? (
        <div className="empty-state small"><span aria-hidden="true">🛎️</span><p>Ready orders wait here until picked up.</p></div>
      ) : (
        <ul className="ready-list">
          {cards.map((card) => (
            <li key={card.id} className={`ready-card${selected.has(card.id) ? ' is-selected' : ''}`}>
              <label className="ready-select">
                <input type="checkbox" checked={selected.has(card.id)} onChange={() => toggle(card.id)} aria-label={`Select order ${card.orderNumber}`} />
              </label>
              <div className="ready-info">
                <p><span className="ready-number">#{card.orderNumber}</span> <strong>{card.customerName}</strong></p>
                <p className="muted small">
                  {card.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                </p>
                <p className="muted small">Ready {card.servingAt ? elapsed(card.servingAt, now) : '0 min'} ago</p>
              </div>
              <button type="button" className="button button-secondary small" onClick={() => clear([card.id])} disabled={complete.isPending}>
                Picked up
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
