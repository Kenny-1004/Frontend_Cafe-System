import { useEffect, useRef, useState } from 'react'
import { API_BASE, refreshSession } from '@/api/client'

export type StreamState = 'connecting' | 'live' | 'offline'

type Options = {
  // Called for every named event
  onEvent: (event: string, data: unknown) => void
  // Called whenever the stream (re)connects: re-fetch snapshots so nothing missed while offline is lost
  onConnect?: () => void
  enabled?: boolean
}

const EVENTS = ['order.status', 'stock.changed', 'menu.changed']

// Server-Sent Events with the recovery the design asks for (§5.7): EventSource reconnects by
// itself after network drops; if the server refuses the stream (401 after the 15-minute
// access token expires) the session is refreshed and the stream reopened.
export function useEventStream(path: string | null, { onEvent, onConnect, enabled = true }: Options): StreamState {
  const [state, setState] = useState<StreamState>('connecting')
  const handlers = useRef({ onEvent, onConnect })
  useEffect(() => {
    handlers.current = { onEvent, onConnect }
  })

  useEffect(() => {
    if (!path || !enabled) return
    let source: EventSource | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    let closed = false

    const open = () => {
      if (closed) return
      setState('connecting')
      source = new EventSource(`${API_BASE}${path}`, { withCredentials: true })

      source.addEventListener('ready', () => {
        attempts = 0
        setState('live')
        handlers.current.onConnect?.()
      })
      for (const name of EVENTS) {
        source.addEventListener(name, (message) => {
          try {
            handlers.current.onEvent(name, JSON.parse((message as MessageEvent<string>).data))
          } catch {
            // ignore malformed events; the next snapshot corrects the screen
          }
        })
      }
      source.onerror = () => {
        if (!source || source.readyState !== EventSource.CLOSED) {
          setState('offline') // the browser is already reconnecting
          return
        }
        // Closed for good (e.g. 401): refresh the session, then reopen with backoff
        setState('offline')
        source.close()
        attempts += 1
        const delay = Math.min(1_000 * 2 ** attempts, 30_000)
        retryTimer = setTimeout(async () => {
          await refreshSession()
          open()
        }, delay)
      }
    }

    open()
    return () => {
      closed = true
      clearTimeout(retryTimer)
      source?.close()
    }
  }, [path, enabled])

  return state
}
