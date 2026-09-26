import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'
export type Toast = { id: number; message: string; tone: ToastTone }

export const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null)

export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used inside <ToastProvider>')
  return toast
}
