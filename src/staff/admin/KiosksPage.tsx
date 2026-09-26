import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/client'
import { useIssuePairingCode, useKiosks, useRegisterKiosk, useUpdateKiosk, type KioskDevice, type PairingCode } from '@/api/admin'
import { Dialog } from '@/ui/Dialog'
import { Switch } from '@/ui/Switch'
import { elapsed, formatDateTime } from '@/ui/format'
import { useToast } from '@/ui/toast'
import { useNow } from '@/ui/useNow'

const STATUS: Record<KioskDevice['status'], { label: string; tone: string }> = {
  paired: { label: 'Paired', tone: 'completed' },
  pairing: { label: 'Waiting for code', tone: 'unpaid' },
  unpaired: { label: 'Not paired', tone: 'cancelled' },
}

export function KiosksPage() {
  const kiosks = useKiosks()
  const update = useUpdateKiosk()
  const issue = useIssuePairingCode()
  const toast = useToast()
  const now = useNow(30_000)
  const [registering, setRegistering] = useState(false)
  const [code, setCode] = useState<PairingCode | null>(null)
  const [confirmRepair, setConfirmRepair] = useState<KioskDevice | null>(null)
  const [renaming, setRenaming] = useState<KioskDevice | null>(null)

  const newCode = (kiosk: KioskDevice) =>
    issue.mutate(kiosk.id, {
      onSuccess: (result) => {
        setConfirmRepair(null)
        setCode(result)
      },
      onError: (error) => toast(errorMessage(error), 'error'),
    })

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Kiosks</h1>
          <p className="muted">Only paired tablets can take orders. Pair each one once with a one-time code.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setRegistering(true)}>+ Register kiosk</button>
      </header>

      <section className="panel table-panel">
        {kiosks.isError && <p className="form-error">{errorMessage(kiosks.error)}</p>}
        <table className="data-table">
          <thead>
            <tr><th>Kiosk</th><th>Status</th><th>Last seen</th><th>Paired</th><th>Active</th><th /></tr>
          </thead>
          <tbody>
            {kiosks.data?.map((kiosk) => (
              <tr key={kiosk.id}>
                <td>
                  <button type="button" className="link-button strong" onClick={() => setRenaming(kiosk)}>{kiosk.name}</button>
                  <p className="muted small">Registered by {kiosk.createdByName}</p>
                </td>
                <td>
                  <span className={`status-pill status-pill-${STATUS[kiosk.status].tone}`}>{STATUS[kiosk.status].label}</span>
                </td>
                <td>{kiosk.lastSeenAt ? `${elapsed(kiosk.lastSeenAt, now)} ago` : '—'}</td>
                <td>{formatDateTime(kiosk.pairedAt)}</td>
                <td>
                  <Switch
                    checked={kiosk.isActive}
                    label={`${kiosk.name} active`}
                    onChange={(isActive) =>
                      update.mutate(
                        { id: kiosk.id, isActive },
                        {
                          onSuccess: () => toast(isActive ? `${kiosk.name} can take orders again` : `${kiosk.name} is locked out`),
                          onError: (error) => toast(errorMessage(error), 'error'),
                        },
                      )
                    }
                  />
                </td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="button button-secondary small"
                    disabled={!kiosk.isActive || issue.isPending}
                    onClick={() => (kiosk.status === 'paired' ? setConfirmRepair(kiosk) : newCode(kiosk))}
                  >
                    {kiosk.status === 'paired' ? 'Re-pair' : 'Pairing code'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {kiosks.isPending && <div className="skeleton" />}
        {kiosks.data?.length === 0 && (
          <div className="empty-state small">
            <span aria-hidden="true">🖥️</span>
            <p>No kiosks yet. Register the first tablet to start taking orders.</p>
          </div>
        )}
      </section>

      {registering && <RegisterDialog onClose={() => setRegistering(false)} onCode={(result) => { setRegistering(false); setCode(result) }} />}
      {code && <CodeDialog code={code} onClose={() => setCode(null)} />}
      {renaming && <RenameDialog kiosk={renaming} onClose={() => setRenaming(null)} />}
      <Dialog
        open={confirmRepair !== null}
        onClose={() => setConfirmRepair(null)}
        title={`Re-pair ${confirmRepair?.name ?? ''}?`}
        size="small"
        footer={
          <>
            <button type="button" className="button button-secondary" onClick={() => setConfirmRepair(null)}>Keep it paired</button>
            <button type="button" className="button button-danger" disabled={issue.isPending} onClick={() => confirmRepair && newCode(confirmRepair)}>
              Un-pair and get a code
            </button>
          </>
        }
      >
        <p>The tablet currently paired as this kiosk stops working immediately. Use this when a tablet was replaced or lost.</p>
      </Dialog>
    </div>
  )
}

function RegisterDialog({ onClose, onCode }: { onClose: () => void; onCode: (code: PairingCode) => void }) {
  const register = useRegisterKiosk()
  const [name, setName] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) register.mutate(name.trim(), { onSuccess: onCode })
  }
  return (
    <Dialog open onClose={onClose} title="Register a kiosk" size="small">
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Name <small>(where it stands)</small></span>
          <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="e.g. Kiosk 1 · entrance" autoFocus />
        </label>
        {register.isError && <p className="form-error">{errorMessage(register.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!name.trim() || register.isPending}>
            {register.isPending ? 'Registering…' : 'Register and get code'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function CodeDialog({ code, onClose }: { code: PairingCode; onClose: () => void }) {
  const now = useNow(1_000)
  const expiresAt = code.kiosk.pairingExpiresAt ? new Date(code.kiosk.pairingExpiresAt).getTime() : now
  const secondsLeft = Math.max(0, Math.round((expiresAt - now) / 1000))
  const expired = secondsLeft === 0

  return (
    <Dialog open onClose={onClose} title={`Pair ${code.kiosk.name}`} size="small" footer={<button type="button" className="button button-primary" onClick={onClose}>Done</button>}>
      <div className="stack pairing-code-box">
        <p>On the tablet, open <strong className="mono">{window.location.origin}/</strong> and enter:</p>
        <p className={`pairing-code${expired ? ' is-expired' : ''}`} aria-label={`Pairing code ${code.pairingCode.split('').join(' ')}`}>{code.pairingCode}</p>
        <p className="muted small">
          {expired ? 'This code expired. Close this and ask for a new one.' : `Works once · expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
        </p>
        <p className="muted small">The code is shown only now. It is not stored anywhere readable.</p>
      </div>
    </Dialog>
  )
}

function RenameDialog({ kiosk, onClose }: { kiosk: KioskDevice; onClose: () => void }) {
  const update = useUpdateKiosk()
  const toast = useToast()
  const [name, setName] = useState(kiosk.name)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    update.mutate({ id: kiosk.id, name: name.trim() }, { onSuccess: () => { toast('Kiosk renamed'); onClose() } })
  }
  return (
    <Dialog open onClose={onClose} title="Rename kiosk" size="small">
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        {update.isError && <p className="form-error">{errorMessage(update.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!name.trim() || update.isPending}>Save</button>
        </div>
      </form>
    </Dialog>
  )
}
