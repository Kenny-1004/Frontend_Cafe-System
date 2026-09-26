import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/client'
import { HOME_BY_ROLE, useSession } from '@/auth/session'
import { BrandMark } from '@/components/Header'

export function LoginPage() {
  const { staff, isLoading, signIn } = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Only same-app paths are allowed as a redirect target (no open redirects)
  const next = params.get('next')
  const safeNext = next && next.startsWith('/staff/') ? next : null

  if (!isLoading && staff) return <Navigate to={safeNext ?? HOME_BY_ROLE[staff.role]} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const signedIn = await signIn(username, password)
      navigate(safeNext ?? HOME_BY_ROLE[signedIn.role], { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <BrandMark />
          <div>
            <h1>Campus Café</h1>
            <p>Staff sign-in</p>
          </div>
        </div>

        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="button button-primary button-block" disabled={submitting || !username || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="login-hint">Cashiers, baristas and managers each land on their own screen.</p>
      </form>
    </main>
  )
}
