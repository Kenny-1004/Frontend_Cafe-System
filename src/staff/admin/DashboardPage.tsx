import { useRef } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/client'
import { adminKeys, useDashboard, useLowStock } from '@/api/admin'
import { formatMoney } from '@/lib/money'
import { useEventStream } from '@/realtime/useEventStream'
import { LiveIndicator } from '@/staff/LiveIndicator'
import { ColumnChart } from '@/ui/ColumnChart'
import { formatDate, formatQuantity } from '@/ui/format'
import { formatPesoNumber, formatPesoTick, hourLabel, pesoNumber, shortDate, shortDay } from '@/staff/admin/chartFormat'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const dashboard = useDashboard()
  const lowStock = useLowStock()

  // Every sale and stock change refreshes the numbers (bursts collapse into one refetch)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stream = useEventStream('/admin/events', {
    onEvent: () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: adminKeys.dashboard })
        void queryClient.invalidateQueries({ queryKey: adminKeys.lowStock })
      }, 800)
    },
  })

  if (dashboard.isPending) return <PageLoading />
  if (dashboard.isError) return <p className="form-error">{errorMessage(dashboard.error)}</p>

  const data = dashboard.data
  const summary = data.todaySummary
  const salesHours = data.salesByHour.filter((row) => Number(row.sales) > 0).map((row) => row.hour)
  const firstHour = Math.min(6, ...salesHours)
  const lastHour = Math.max(21, ...salesHours)
  const hours = data.salesByHour.filter((row) => row.hour >= firstHour && row.hour <= lastHour)

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">{formatDate(data.today)} · café time (Asia/Manila)</p>
        </div>
        <LiveIndicator state={stream} />
      </header>

      <section className="stat-row" aria-label="Today at a glance">
        <div className="stat-tile hero">
          <p className="stat-label">Sales today</p>
          <p className="stat-value">{formatMoney(summary.grossSales)}</p>
          <p className="stat-sub">{summary.ordersPaid} paid order{summary.ordersPaid === 1 ? '' : 's'}</p>
        </div>
        <div className="stat-tile">
          <p className="stat-label">Average order</p>
          <p className="stat-value">{formatMoney(summary.averageOrder)}</p>
          <p className="stat-sub">{summary.itemsSold} items sold</p>
        </div>
        <Link to="/staff/cashier" className="stat-tile link-tile">
          <p className="stat-label">Waiting to pay</p>
          <p className="stat-value">{data.openOrders.unpaid}</p>
          <p className="stat-sub">at the counter</p>
        </Link>
        <Link to="/staff/board" className="stat-tile link-tile">
          <p className="stat-label">On the board</p>
          <p className="stat-value">{data.openOrders.pending + data.openOrders.serving}</p>
          <p className="stat-sub">{data.openOrders.pending} preparing · {data.openOrders.serving} ready</p>
        </Link>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <h2 className="panel-title">Sales by hour · today</h2>
          <ColumnChart
            ariaLabel="Sales by hour today"
            data={hours.map((row) => ({
              key: String(row.hour),
              label: hourLabel(row.hour),
              value: pesoNumber(row.sales),
              detail: `${row.orders} order${row.orders === 1 ? '' : 's'}`,
            }))}
            formatValue={formatPesoNumber}
            formatTick={formatPesoTick}
          />
        </section>

        <section className="panel">
          <h2 className="panel-title">Sales · last 7 days</h2>
          <ColumnChart
            ariaLabel="Sales for the last 7 days"
            data={data.last7Days.map((day) => ({
              key: day.businessDate,
              label: shortDay(day.businessDate),
              value: pesoNumber(day.grossSales),
              detail: `${shortDate(day.businessDate)} · ${day.ordersPaid} orders`,
            }))}
            formatValue={formatPesoNumber}
            formatTick={formatPesoTick}
          />
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2 className="panel-title">Best sellers · today</h2>
            <Link to="/staff/admin/reports" className="link-button">Reports →</Link>
          </div>
          {data.bestSellersToday.length === 0 ? (
            <p className="muted">No sales yet today.</p>
          ) : (
            <ol className="rank-list">
              {data.bestSellersToday.map((product, index) => (
                <li key={product.productId}>
                  <span className="rank">{index + 1}</span>
                  <span className="rank-name">{product.productName}</span>
                  <span className="rank-units">{product.unitsSold} sold</span>
                  <span className="rank-amount">{formatMoney(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <div className="panel-title-row">
            <h2 className="panel-title">Low stock</h2>
            <Link to="/staff/admin/inventory?status=low" className="link-button">Inventory →</Link>
          </div>
          {lowStock.isPending ? (
            <div className="skeleton" />
          ) : (lowStock.data ?? []).length === 0 ? (
            <p className="muted">✓ Every ingredient is above its reorder level.</p>
          ) : (
            <ul className="low-list">
              {lowStock.data!.slice(0, 8).map((item) => {
                const ratio = Number(item.reorderLevel) > 0 ? Math.min(1, Number(item.stockQty) / Number(item.reorderLevel)) : 0
                return (
                  <li key={item.id}>
                    <div className="low-row">
                      <span className="status-icon warning" aria-hidden="true">!</span>
                      <span className="low-name">{item.name}</span>
                      <span className="low-qty">{formatQuantity(item.stockQty)} / {formatQuantity(item.reorderLevel)} {item.unit}</span>
                    </div>
                    <div className="meter" aria-label={`${Math.round(ratio * 100)}% of reorder level`}>
                      <span style={{ width: `${Math.max(2, ratio * 100)}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="page-state">
      <div className="spinner" aria-hidden="true" />
    </div>
  )
}
