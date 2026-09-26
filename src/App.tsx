import { Navigate, Outlet, Route, Routes } from 'react-router'
import { Header } from '@/components/Header'
import { KioskGate } from '@/components/KioskGate'
import { MenuPage } from '@/pages/MenuPage'
import { OrderPage } from '@/pages/OrderPage'
import { DisplayPage } from '@/pages/DisplayPage'
import { RequireStaff } from '@/auth/RequireStaff'
import { HOME_BY_ROLE, useSession } from '@/auth/session'
import { StaffLayout } from '@/staff/StaffLayout'
import { LoginPage } from '@/staff/pages/LoginPage'
import { CashierPage } from '@/staff/pages/CashierPage'
import { BoardPage } from '@/staff/pages/BoardPage'
import { DashboardPage } from '@/staff/admin/DashboardPage'
import { OrdersPage } from '@/staff/admin/OrdersPage'
import { MenuPage as AdminMenuPage } from '@/staff/admin/MenuPage'
import { InventoryPage } from '@/staff/admin/InventoryPage'
import { SuppliersPage } from '@/staff/admin/SuppliersPage'
import { DeliveriesPage } from '@/staff/admin/DeliveriesPage'
import { StaffPage } from '@/staff/admin/StaffPage'
import { ReportsPage } from '@/staff/admin/ReportsPage'
import { KiosksPage } from '@/staff/admin/KiosksPage'

function KioskLayout() {
  return (
    <KioskGate>
      <div className="app">
        <Header />
        <Outlet />
      </div>
    </KioskGate>
  )
}

// /staff sends each role to its own screen
function StaffHome() {
  const { staff } = useSession()
  return <Navigate to={staff ? HOME_BY_ROLE[staff.role] : '/staff/login'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Customer kiosk (public) */}
      <Route element={<KioskLayout />}>
        <Route path="/" element={<MenuPage />} />
        <Route path="/orders/:publicId" element={<OrderPage />} />
      </Route>

      {/* Public now-serving screen (TV at the counter): no login */}
      <Route path="/display" element={<DisplayPage />} />

      {/* Staff panels */}
      <Route path="/staff/login" element={<LoginPage />} />
      <Route
        path="/staff"
        element={
          <RequireStaff roles={['cashier', 'kitchen', 'admin']}>
            <StaffLayout />
          </RequireStaff>
        }
      >
        <Route index element={<StaffHome />} />
        <Route path="cashier" element={<RequireStaff roles={['cashier', 'admin']}><CashierPage /></RequireStaff>} />
        <Route path="board" element={<BoardPage />} />
        <Route path="admin" element={<RequireStaff roles={['admin']}><Outlet /></RequireStaff>}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="kiosks" element={<KiosksPage />} />
        </Route>
        <Route path="*" element={<StaffHome />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
