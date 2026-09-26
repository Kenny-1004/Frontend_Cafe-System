import type { ApiEnvelope, ApiErrorDetail } from '@/api/types'

// Thrown for every failed request. `code` is the backend's stable error code
// (VALIDATION_FAILED, OUT_OF_STOCK, NOT_FOUND ...), so the UI never parses messages.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// In development Vite proxies /api to the backend (see vite.config.ts), so paths stay relative
// and the staff session cookies are same-origin.
export const API_BASE = '/api/v1'

type SessionListener = () => void
const sessionLostListeners = new Set<SessionListener>()

// The session provider subscribes here to send the user back to the sign-in page
export function onSessionLost(listener: SessionListener) {
  sessionLostListeners.add(listener)
  return () => {
    sessionLostListeners.delete(listener)
  }
}

const kioskUnpairedListeners = new Set<SessionListener>()

// The kiosk gate subscribes here: a deactivated or re-paired tablet shows the pairing screen
export function onKioskUnpaired(listener: SessionListener) {
  kioskUnpairedListeners.add(listener)
  return () => {
    kioskUnpairedListeners.delete(listener)
  }
}

let refreshing: Promise<boolean> | null = null

// Exchanges the refresh cookie for a new access cookie. Concurrent callers share one request,
// because refresh tokens rotate and a second parallel refresh would be rejected.
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0)
    })
  return refreshing
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/session', '/kiosk/pair', '/kiosk/session']

async function send(path: string, init: RequestInit) {
  try {
    return await fetch(`${API_BASE}${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the café server. Please check the connection.')
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response = await send(path, init)

  // Access tokens last 15 minutes: refresh once and retry transparently
  if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) {
      response = await send(path, init)
    }
    if (response.status === 401) sessionLostListeners.forEach((listener) => listener())
  }

  let body: ApiEnvelope<T> | null = null
  try {
    body = (await response.json()) as ApiEnvelope<T>
  } catch {
    // Not JSON (e.g. the proxy could not reach the backend); handled below
  }

  if (response.status === 401 && body?.error?.code === 'KIOSK_NOT_PAIRED') {
    kioskUnpairedListeners.forEach((listener) => listener())
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? (response.status === 504 || response.status === 502 ? 'NETWORK_ERROR' : 'HTTP_ERROR'),
      body?.message ?? (response.status >= 500 ? 'The café server is not responding.' : `Request failed (HTTP ${response.status})`),
      body?.error?.details ?? [],
    )
  }

  return body.data as T
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

// Human-readable message for any error, including field-level validation details
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details.length > 0) return error.details.map((detail) => detail.message).join('. ')
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
