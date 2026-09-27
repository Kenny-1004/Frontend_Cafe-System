// Shared landing-page constants and helpers (kept out of component files for fast refresh)

// One easing curve for the whole page keeps every movement feeling related
export const EASE = [0.22, 1, 0.36, 1] as const
export const KIOSK_PATH = '/kiosk'

export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'menu', label: 'Menu' },
  { id: 'about', label: 'About us' },
  { id: 'contact', label: 'Contact us' },
] as const

// Café details shown on the page: edit these to match your café
export const CAFE = {
  address: ['Ground floor, Student Center', 'Main Campus'],
  hours: [
    ['Monday – Friday', '7:00 AM – 8:00 PM'],
    ['Saturday', '8:00 AM – 5:00 PM'],
    ['Sunday', 'Closed'],
  ],
  email: 'hello@campuscafe.edu',
}

export function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  history.replaceState(null, '', id === 'home' ? location.pathname : `#${id}`)
}
