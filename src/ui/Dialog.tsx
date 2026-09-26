import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'small' | 'medium' | 'large'
}

// Native <dialog>: focus trap, Esc to close and the backdrop come from the browser
export function Dialog({ open, onClose, title, children, footer, size = 'medium' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`staff-dialog staff-dialog-${size}`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="staff-dialog-inner">
          <header className="staff-dialog-header">
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
          <div className="staff-dialog-body">{children}</div>
          {footer && <footer className="staff-dialog-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
