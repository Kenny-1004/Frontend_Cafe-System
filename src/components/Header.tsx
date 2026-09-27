import { Link } from 'react-router'

// The café's own mark: a cup with steam (not any other brand's logo)
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="currentColor" />
      <path
        d="M14 19h17v8a8 8 0 0 1-8 8h-1a8 8 0 0 1-8-8z M31 21h2.5a3.5 3.5 0 0 1 0 7H31"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M19 11c-1.5 2 1.5 3 0 5 M24 10c-1.5 2 1.5 3 0 5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Header() {
  return (
    <header className="header">
      <Link to="/kiosk" className="brand" aria-label="Campus Café, back to menu">
        <BrandMark />
        <span className="brand-name">Campus Café</span>
      </Link>
      <span className="header-tagline">
        <span className="header-dot" aria-hidden="true" />
        Order here · Pay at the counter
      </span>
    </header>
  )
}
