import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage, onKioskUnpaired } from '@/api/client'
import { kioskKeys, useKioskSession, usePairKiosk } from '@/api/kiosk'
import { BrandMark } from '@/components/Header'

// Only paired tablets (or a signed-in manager previewing) can use the kiosk (design §5.2)
export function KioskGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useKioskSession()

  // A tablet that is deactivated or re-paired elsewhere drops back to the pairing screen
  useEffect(() => onKioskUnpaired(() => void queryClient.invalidateQueries({ queryKey: kioskKeys.session })), [queryClient])

  if (session.isPending) {
    return (
      <main className="page-state">
        <div className="spinner" aria-hidden="true" />
      </main>
    )
  }

  if (session.isError) {
    return (
      <main className="page-state">
        <p className="page-state-title">Can’t reach the café server.</p>
        <p className="muted">{errorMessage(session.error)}</p>
        <button type="button" className="button button-primary" onClick={() => void session.refetch()}>Try again</button>
      </main>
    )
  }

  if (!session.data.kiosk) return <PairingScreen />

  return (
    <>
      {session.data.preview && (
        <div className="preview-banner" role="status">
          Manager preview. Customers use a paired kiosk tablet. Orders placed here are real.
        </div>
      )}
      {children}
    </>
  )
}

function PairingScreen() {
  const pair = usePairKiosk()
  const [code, setCode] = useState('')

  // Shown as XXXX-XXXX while typing; the server accepts any spacing or case
  const format = (value: string) => {
    const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars
  }
  const complete = code.replace('-', '').length === 8

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (complete) pair.mutate(code)
  }

  return (
    <main className="pairing-page">
      <form className="pairing-card" onSubmit={submit}>
        <div className="login-brand">
          <BrandMark />
          <div>
            <h1>Set up this kiosk</h1>
            <p>Campus Café</p>
          </div>
        </div>
        <ol className="pairing-steps">
          <li>A manager opens <strong>Back office → Kiosks</strong> and registers this tablet.</li>
          <li>Enter the 8-character code shown there. It works once, for 15 minutes.</li>
        </ol>
        <label className="field">
          <span>Pairing code</span>
          <input
            className="pairing-input"
            value={code}
            onChange={(event) => {
              setCode(format(event.target.value))
              if (pair.isError) pair.reset() // a new attempt clears the old error
            }}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            aria-describedby={pair.isError ? 'pairing-error' : undefined}
          />
        </label>
        {pair.isError && <p id="pairing-error" className="form-error" role="alert">{errorMessage(pair.error)}</p>}
        <button type="submit" className="button button-primary button-block" disabled={!complete || pair.isPending}>
          {pair.isPending ? 'Pairing…' : 'Pair this kiosk'}
        </button>
        <p className="login-hint">Staff sign in at <a href="/staff/login">/staff/login</a>.</p>
      </form>
    </main>
  )
}
