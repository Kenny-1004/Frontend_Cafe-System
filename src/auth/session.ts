import { createContext, useContext } from 'react'
import type { EmployeeRole, Staff } from '@/api/types'

export type Session = {
  staff: Staff | null
  isLoading: boolean
  signIn: (username: string, password: string) => Promise<Staff>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<Session | null>(null)

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside <SessionProvider>')
  return session
}

// Where each role lands after signing in
export const HOME_BY_ROLE: Record<EmployeeRole, string> = {
  admin: '/staff/admin',
  cashier: '/staff/cashier',
  kitchen: '/staff/board',
}

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  admin: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Barista',
}
