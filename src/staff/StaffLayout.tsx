import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import type { EmployeeRole } from '@/api/types'
import { ROLE_LABEL, useSession } from '@/auth/session'
import { BrandMark } from '@/components/Header'

type NavItem = { to: string; label: string; icon: string; roles: EmployeeRole[]; end?: boolean }

const NAV: { heading?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: '/staff/cashier', label: 'Cashier', icon: '💵', roles: ['cashier', 'admin'] },
      { to: '/staff/board', label: 'Orders board', icon: '📋', roles: ['kitchen', 'cashier', 'admin'] },
    ],
  },
  {
    heading: 'Back office',
    items: [
      { to: '/staff/admin', label: 'Dashboard', icon: '📈', roles: ['admin'], end: true },
      { to: '/staff/admin/orders', label: 'Orders', icon: '🧾', roles: ['admin'] },
      { to: '/staff/admin/menu', label: 'Menu', icon: '☕', roles: ['admin'] },
      { to: '/staff/admin/inventory', label: 'Inventory', icon: '📦', roles: ['admin'] },
      { to: '/staff/admin/suppliers', label: 'Suppliers', icon: '🚚', roles: ['admin'] },
      { to: '/staff/admin/deliveries', label: 'Deliveries', icon: '📥', roles: ['admin'] },
      { to: '/staff/admin/staff', label: 'Staff', icon: '👥', roles: ['admin'] },
      { to: '/staff/admin/kiosks', label: 'Kiosks', icon: '🖥️', roles: ['admin'] },
      { to: '/staff/admin/reports', label: 'Reports', icon: '📊', roles: ['admin'] },
    ],
  },
]

export function StaffLayout() {
  const { staff, signOut } = useSession()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  if (!staff) return null

  const sections = NAV.map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(staff.role)) }))
    .filter((section) => section.items.length > 0)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      navigate('/staff/login', { replace: true })
    }
  }

  return (
    <div className={`staff-shell${menuOpen ? ' is-menu-open' : ''}`}>
      <aside className="staff-sidebar">
        <div className="staff-brand">
          <BrandMark />
          <div>
            <p className="staff-brand-name">Campus Café</p>
            <p className="staff-brand-sub">Staff</p>
          </div>
          <button type="button" className="staff-menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
            ☰
          </button>
        </div>

        <nav className="staff-nav" aria-label="Staff navigation" onClick={() => setMenuOpen(false)}>
          {sections.map((section, index) => (
            <div key={index} className="staff-nav-section">
              {section.heading && <p className="staff-nav-heading">{section.heading}</p>}
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className="staff-nav-link">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="staff-nav-section">
            <a href="/display" target="_blank" rel="noreferrer" className="staff-nav-link">
              <span aria-hidden="true">📺</span>
              Order display
            </a>
            <a href="/" target="_blank" rel="noreferrer" className="staff-nav-link">
              <span aria-hidden="true">↗</span>
              Preview kiosk
            </a>
          </div>
        </nav>

        <div className="staff-user">
          <div className="staff-avatar" aria-hidden="true">
            {staff.fullName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </div>
          <div className="staff-user-info">
            <p className="staff-user-name">{staff.fullName}</p>
            <p className="staff-user-role">{ROLE_LABEL[staff.role]}</p>
          </div>
          <button type="button" className="staff-signout" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? '…' : 'Sign out'}
          </button>
        </div>
      </aside>

      <div className="staff-main">
        <Outlet />
      </div>
    </div>
  )
}
