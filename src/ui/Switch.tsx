type Props = { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }

// Accessible on/off switch (a checkbox with role="switch")
export function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <label className={`switch${disabled ? ' is-disabled' : ''}`} onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} aria-label={label} />
      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    </label>
  )
}
