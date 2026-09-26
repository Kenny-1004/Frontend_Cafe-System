import { useState } from 'react'
import { errorMessage } from '@/api/client'
import { useBestSellers, useDailySales, useSalesSummary, type Range } from '@/api/admin'
import { formatMoney } from '@/lib/money'
import { ColumnChart } from '@/ui/ColumnChart'
import { formatDate } from '@/ui/format'
import { formatPesoNumber, formatPesoTick, pesoNumber, shortDate } from '@/staff/admin/chartFormat'

type Preset = '7' | '30' | 'month' | 'custom'

const iso = (date: Date) => date.toISOString().slice(0, 10)

// Café days are Asia/Manila (UTC+8)
function cafeToday() {
  return iso(new Date(Date.now() + 8 * 3_600_000))
}

function rangeFor(preset: Preset, custom: Range): Range {
  const today = cafeToday()
  const shift = (days: number) => iso(new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000))
  if (preset === '7') return { from: shift(-6), to: today }
  if (preset === '30') return { from: shift(-29), to: today }
  if (preset === 'month') return { from: `${today.slice(0, 8)}01`, to: today }
  return custom
}

export function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('7')
  const [custom, setCustom] = useState<Range>({ from: cafeToday(), to: cafeToday() })
  const range = rangeFor(preset, custom)
  const validCustom = preset !== 'custom' || (custom.from && custom.to && custom.from <= custom.to)

  const daily = useDailySales(validCustom ? range : {})
  const best = useBestSellers(validCustom ? range : {}, 20)
  const summary = useSalesSummary(validCustom ? range : {})

  const exportCsv = () => {
    if (!daily.data) return
    const rows = [['Date', 'Orders paid', 'Gross sales (PHP)'], ...daily.data.days.map((day) => [day.businessDate, String(day.ordersPaid), day.grossSales])]
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `daily-sales-${daily.data.from}-to-${daily.data.to}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="staff-page">
      <header className="staff-page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Paid orders only. Cancelled and unpaid orders never count as sales.</p>
        </div>
        <button type="button" className="button button-secondary" onClick={exportCsv} disabled={!daily.data}>
          Export CSV
        </button>
      </header>

      <div className="filter-bar">
        <div className="segmented" role="radiogroup" aria-label="Date range">
          {([['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom']] as const).map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={preset === value} className={preset === value ? 'is-selected' : ''} onClick={() => setPreset(value)}>
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="date-range">
            <input type="date" value={custom.from} max={cafeToday()} onChange={(event) => setCustom({ ...custom, from: event.target.value })} aria-label="From" />
            <span>to</span>
            <input type="date" value={custom.to} max={cafeToday()} onChange={(event) => setCustom({ ...custom, to: event.target.value })} aria-label="To" />
          </div>
        )}
        {daily.data && <span className="muted small">{formatDate(daily.data.from)} – {formatDate(daily.data.to)}</span>}
      </div>

      {!validCustom && <p className="form-error">Pick a start date on or before the end date.</p>}
      {daily.isError && <p className="form-error">{errorMessage(daily.error)}</p>}

      {summary.data && (
        <section className="stat-row">
          <div className="stat-tile hero">
            <p className="stat-label">Gross sales</p>
            <p className="stat-value">{formatMoney(summary.data.grossSales)}</p>
            <p className="stat-sub">{summary.data.ordersPaid} paid orders</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Average order</p>
            <p className="stat-value">{formatMoney(summary.data.averageOrder)}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Items sold</p>
            <p className="stat-value">{summary.data.itemsSold.toLocaleString('en-PH')}</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">Cancelled · expired</p>
            <p className="stat-value">{summary.data.cancelledOrders} · {summary.data.expiredOrders}</p>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Daily sales</h2>
        {daily.data ? (
          <ColumnChart
            ariaLabel="Daily sales"
            height={260}
            data={daily.data.days.map((day) => ({
              key: day.businessDate,
              label: shortDate(day.businessDate),
              value: pesoNumber(day.grossSales),
              detail: `${day.ordersPaid} orders`,
            }))}
            formatValue={formatPesoNumber}
            formatTick={formatPesoTick}
          />
        ) : (
          <div className="skeleton tall" />
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">Best sellers</h2>
        {best.data && best.data.products.length === 0 ? (
          <p className="muted">No sales in this period.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>#</th><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr>
            </thead>
            <tbody>
              {(best.data?.products ?? []).map((product, index) => (
                <tr key={product.productId}>
                  <td className="muted">{index + 1}</td>
                  <td>{product.productName}</td>
                  <td className="num">{product.unitsSold}</td>
                  <td className="num">{formatMoney(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
