import { useState, type FormEvent } from 'react'
import { errorMessage } from '@/api/client'
import { useEmployees, useSaveEmployee } from '@/api/admin'
import type { Employee, EmployeeRole } from '@/api/types'
import { ROLE_LABEL, useSession } from '@/auth/session'
import { Dialog } from '@/ui/Dialog'
import { Switch } from '@/ui/Switch'
import { formatDateTime } from '@/ui/format'
import { useToast } from '@/ui/toast'

const ROLES: EmployeeRole[] = ['cashier', 'kitchen', 'admin']
const USERNAME = /^[a-z0-9._-]{3,30}$/

export function StaffPage() {
  const employees = useEmployees()
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Staff</h1>
          <p className="muted">Accounts and roles. Deactivating someone signs them out on every device immediately.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => setEditing('new')}>+ New account</button>
      </header>

      <section className="panel table-panel">
        {employees.isError && <p className="form-error">{errorMessage(employees.error)}</p>}
        <table className="data-table clickable">
          <thead>
            <tr><th>Name</th><th>Username</th><th>Role</th><th>Last sign-in</th><th className="num">Active sessions</th><th>Status</th></tr>
          </thead>
          <tbody>
            {employees.data?.map((employee) => (
              <tr key={employee.id} onClick={() => setEditing(employee)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setEditing(employee)}>
                <td><strong>{employee.fullName}</strong></td>
                <td className="mono">{employee.username}</td>
                <td><span className={`role-tag role-${employee.role}`}>{ROLE_LABEL[employee.role]}</span></td>
                <td>{formatDateTime(employee.lastLoginAt)}</td>
                <td className="num">{employee.activeSessions}</td>
                <td>{employee.isActive ? <span className="status-pill status-pill-completed">Active</span> : <span className="status-pill status-pill-cancelled">Deactivated</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.isPending && <div className="skeleton" />}
      </section>

      {editing && <EmployeeDialog employee={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function EmployeeDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const { staff } = useSession()
  const save = useSaveEmployee()
  const toast = useToast()
  const isSelf = employee?.id === staff?.id
  const [form, setForm] = useState({
    username: employee?.username ?? '',
    fullName: employee?.fullName ?? '',
    role: employee?.role ?? ('cashier' as EmployeeRole),
    isActive: employee?.isActive ?? true,
    password: '',
  })

  const passwordOk = employee ? !form.password || form.password.length >= 8 : form.password.length >= 8
  const valid = form.fullName.trim() && passwordOk && (employee || USERNAME.test(form.username))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    const body = employee
      ? {
          id: employee.id,
          fullName: form.fullName.trim(),
          ...(isSelf ? {} : { role: form.role, isActive: form.isActive }),
          ...(form.password ? { password: form.password } : {}),
        }
      : { username: form.username, fullName: form.fullName.trim(), role: form.role, password: form.password }
    save.mutate(body, {
      onSuccess: () => {
        toast(employee ? 'Account saved' : `Account ${form.username} created`)
        onClose()
      },
    })
  }

  return (
    <Dialog open onClose={onClose} title={employee ? `Edit ${employee.fullName}` : 'New staff account'} size="small">
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span>Full name</span>
          <input value={form.fullName} maxLength={80} onChange={(event) => setForm({ ...form, fullName: event.target.value })} autoFocus required />
        </label>
        <label className="field">
          <span>Username</span>
          <input
            value={form.username}
            disabled={Boolean(employee)}
            onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase().replace(/\s/g, '') })}
            autoCapitalize="none"
          />
          {!employee && form.username && !USERNAME.test(form.username) && <small className="field-error">3–30 letters, digits, dots, dashes or underscores</small>}
        </label>
        <label className="field">
          <span>Role</span>
          <select value={form.role} disabled={isSelf} onChange={(event) => setForm({ ...form, role: event.target.value as EmployeeRole })}>
            {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABEL[role]} · {role === 'admin' ? 'everything' : role === 'cashier' ? 'cashier + board' : 'orders board'}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{employee ? 'New password' : 'Password'} {employee && <small>(leave empty to keep; setting one signs them out)</small>}</span>
          <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" minLength={employee ? undefined : 8} />
          {form.password && form.password.length < 8 && <small className="field-error">At least 8 characters</small>}
        </label>
        {employee && (
          <label className="field toggle-field">
            <span>Active {isSelf && <small>(you can’t deactivate yourself)</small>}</span>
            <Switch checked={form.isActive} disabled={isSelf} onChange={(value) => setForm({ ...form, isActive: value })} label="Active" />
          </label>
        )}
        {save.isError && <p className="form-error">{errorMessage(save.error)}</p>}
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!valid || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Dialog>
  )
}
