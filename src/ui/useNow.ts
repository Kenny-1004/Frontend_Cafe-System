import { useEffect, useState } from 'react'

// Re-renders every `interval` ms so "3 min ago" labels stay current
export function useNow(interval: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [interval])
  return now
}
