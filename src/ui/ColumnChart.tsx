import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type ColumnDatum = { key: string; label: string; value: number; detail?: string }

type Props = {
  data: ColumnDatum[]
  formatValue: (value: number) => string
  formatTick?: (value: number) => string
  height?: number
  ariaLabel: string
}

const PAD = { top: 22, right: 8, bottom: 26, left: 52 }
const MAX_COLUMN = 24 // columns never fill their slot
const RADIUS = 4

// Clean axis ticks: 0, 500, 1,000 ... chosen from 1/2/5 × 10^n steps
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= raw) ?? raw
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
}

// Column with a 4px rounded data end and a square baseline
function columnPath(x: number, y: number, width: number, height: number) {
  const radius = Math.min(RADIUS, width / 2, height)
  return [
    `M${x},${y + height}`,
    `V${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `H${x + width - radius}`,
    `Q${x + width},${y} ${x + width},${y + radius}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

// Single-series column chart: one hue, no legend (the title names the series),
// the peak labelled, every column hoverable, and a table view for screen readers.
export function ColumnChart({ data, formatValue, formatTick = formatValue, height = 220, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  // Draw at the container's real width so text renders at its true size (no scaling)
  const frameRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const { ticks, yMax, band, peakIndex } = useMemo(() => {
    const max = Math.max(0, ...data.map((datum) => datum.value))
    const tickValues = niceTicks(max)
    return {
      ticks: tickValues,
      yMax: tickValues[tickValues.length - 1] || 1,
      band: (width - PAD.left - PAD.right) / Math.max(1, data.length),
      peakIndex: max > 0 ? data.findIndex((datum) => datum.value === max) : -1,
    }
  }, [data, width])

  const plotHeight = height - PAD.top - PAD.bottom
  const y = (value: number) => PAD.top + plotHeight - (value / yMax) * plotHeight
  const columnWidth = Math.min(MAX_COLUMN, band * 0.62)
  const labelEvery = Math.ceil(data.length / Math.max(4, Math.floor((width - PAD.left) / 44))) // never crowd x labels

  const hovered = hover !== null ? data[hover] : null

  return (
    <div className="chart">
      <div className="chart-frame" ref={frameRef}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} aria-describedby={tableId} onMouseLeave={() => setHover(null)}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text className="chart-tick" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {data.map((datum, index) => {
            const bandX = PAD.left + index * band
            const x = bandX + (band - columnWidth) / 2
            const top = y(datum.value)
            const barHeight = Math.max(0, PAD.top + plotHeight - top)
            return (
              <g key={datum.key}>
                {barHeight > 0 && (
                  <path className={`chart-column${hover === index ? ' is-hover' : ''}`} d={columnPath(x, top, columnWidth, barHeight)} />
                )}
                {index === peakIndex && (
                  <text className="chart-value" x={x + columnWidth / 2} y={top - 6} textAnchor="middle">
                    {formatValue(datum.value)}
                  </text>
                )}
                {index % labelEvery === 0 && (
                  <text className="chart-tick" x={bandX + band / 2} y={height - 8} textAnchor="middle">
                    {datum.label}
                  </text>
                )}
                {/* Hit target: the whole band, taller and wider than the mark */}
                <rect
                  x={bandX}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHover(index)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${datum.label}: ${formatValue(datum.value)}${datum.detail ? `, ${datum.detail}` : ''}`}
                />
              </g>
            )
          })}
          <line className="chart-axis" x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotHeight} y2={PAD.top + plotHeight} />
        </svg>

        {hovered && hover !== null && (
          <div
            className="chart-tooltip"
            style={{ left: `${((PAD.left + hover * band + band / 2) / width) * 100}%`, top: `${(y(hovered.value) / height) * 100}%` }}
          >
            <strong>{formatValue(hovered.value)}</strong>
            <span>{hovered.label}</span>
            {hovered.detail && <span>{hovered.detail}</span>}
          </div>
        )}
      </div>

      <button type="button" className="link-button chart-table-toggle" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
        {showTable ? 'Hide table' : 'Show as table'}
      </button>
      <table id={tableId} className={showTable ? 'data-table compact' : 'visually-hidden'}>
        <thead>
          <tr><th>Period</th><th className="num">Value</th>{data.some((datum) => datum.detail) && <th>Detail</th>}</tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.key}>
              <td>{datum.label}</td>
              <td className="num">{formatValue(datum.value)}</td>
              {data.some((row) => row.detail) && <td>{datum.detail ?? ''}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
