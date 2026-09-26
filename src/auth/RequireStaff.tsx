import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import type { EmployeeRole } from '@/api/types'
import { HOME_BY_ROLE, useSession } from '@/auth/session'

type Props = { roles: EmployeeRole[]; children: ReactNode }

// Route guard. The API enforces the same roles; this only keeps people on screens they can use.
export function RequireStaff({ roles, children }: Props) {
  const { staff, isLoading } = useSession()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="page-state">
        <div className="spinner" aria-hidden="true" />
        <p>Checking your session…</p>
      </main>
    )
  }

  if (!staff) {
    return <Navigate to={`/staff/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  if (!roles.includes(staff.role)) {
    return (
      <main className="page-state">
        <p className="page-state-title">This area isn’t available for your role.</p>
        <Link to={HOME_BY_ROLE[staff.role]} className="button button-primary">
          Go to my screen
        </Link>
      </main>
    )
  }

  return children
}
