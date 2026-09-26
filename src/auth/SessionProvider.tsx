import { useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { onSessionLost } from '@/api/client'
import { authApi } from '@/api/staff'
import { SessionContext, type Session } from '@/auth/session'
import type { Staff } from '@/api/types'

const ME_KEY = ['auth', 'me'] as const

// Who is signed in, from GET /auth/session. The access cookie is httpOnly, so the page can
// never read the token itself; the server is the only source of truth.
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // The public kiosk never needs a staff session, so it never asks for one
  const onStaffPages = useLocation().pathname.startsWith('/staff')

  const me = useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<Staff | null> => (await authApi.session()).staff,
    staleTime: 5 * 60_000,
    retry: false,
    enabled: onStaffPages,
  })

  // Any request that finds the session gone (expired, revoked, deactivated) signs out here
  useEffect(
    () =>
      onSessionLost(() => {
        queryClient.setQueryData(ME_KEY, null)
      }),
    [queryClient],
  )

  const value = useMemo<Session>(
    () => ({
      staff: me.data ?? null,
      isLoading: onStaffPages && me.isPending,
      signIn: async (username, password) => {
        const { staff } = await authApi.login({ username, password })
        queryClient.clear() // nothing from a previous user survives
        queryClient.setQueryData(ME_KEY, staff)
        return staff
      },
      signOut: async () => {
        try {
          await authApi.logout()
        } finally {
          queryClient.clear()
          queryClient.setQueryData(ME_KEY, null)
        }
      },
    }),
    [me.data, me.isPending, onStaffPages, queryClient],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
