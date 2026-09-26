import type { StreamState } from '@/realtime/useEventStream'

const LABEL: Record<StreamState, string> = { live: 'Live', connecting: 'Connecting…', offline: 'Reconnecting…' }

export function LiveIndicator({ state }: { state: StreamState }) {
  return (
    <span className={`live-indicator live-${state}`} title={state === 'live' ? 'Updates arrive instantly' : 'Showing the last known data'}>
      <span className="live-dot" aria-hidden="true" />
      {LABEL[state]}
    </span>
  )
}
