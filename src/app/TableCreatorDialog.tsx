import { useEffect, useRef, useState } from 'react'
import { t } from './i18n'

const GRID_MAX_ROWS = 8
const GRID_MAX_COLS = 8

interface Props {
  onClose(): void
  onCreate(rows: number, cols: number): void
}

export function TableCreatorDialog({ onClose, onCreate }: Props) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  const rowsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    rowsInputRef.current?.focus()
    rowsInputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const effectiveRows = hoverRow !== null ? hoverRow : rows
  const effectiveCols = hoverCol !== null ? hoverCol : cols

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const r = Math.max(1, Math.min(100, rows || 1))
    const c = Math.max(1, Math.min(30, cols || 1))
    onCreate(r, c)
  }

  const handleCellClick = (r: number, c: number) => {
    onCreate(r, c)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="table-creator-dialog" onClick={e => e.stopPropagation()}>
        <div className="table-creator-header">
          <h2>{t('tableCreator.title')}</h2>
          <button className="table-creator-close" onClick={onClose} aria-label={t('about.close')}>×</button>
        </div>

        <div className="table-creator-body">
          {/* Interactive Grid Picker */}
          <div className="table-grid-section">
            <div className="table-grid-label">
              <span>{t('tableCreator.grid')}</span>
              <span className="table-grid-dim">
                {effectiveRows} × {effectiveCols}
              </span>
            </div>
            <div
              className="table-grid"
              onMouseLeave={() => { setHoverRow(null); setHoverCol(null) }}
            >
              {Array.from({ length: GRID_MAX_ROWS }).map((_, rIdx) => {
                const r = rIdx + 1
                return (
                  <div key={r} className="table-grid-row">
                    {Array.from({ length: GRID_MAX_COLS }).map((_, cIdx) => {
                      const c = cIdx + 1
                      const isHighlighted = r <= effectiveRows && c <= effectiveCols
                      return (
                        <div
                          key={c}
                          className={`table-grid-cell${isHighlighted ? ' active' : ''}`}
                          onMouseEnter={() => {
                            setHoverRow(r)
                            setHoverCol(c)
                            setRows(r)
                            setCols(c)
                          }}
                          onClick={() => handleCellClick(r, c)}
                          title={`${r} × ${c}`}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Precision Numeric Form */}
          <form className="table-creator-form" onSubmit={handleSubmit}>
            <label className="table-form-row">
              <span>{t('tableCreator.rows')}</span>
              <input
                ref={rowsInputRef}
                type="number"
                min={1}
                max={100}
                value={rows}
                onChange={e => setRows(Number(e.target.value))}
              />
            </label>
            <label className="table-form-row">
              <span>{t('tableCreator.cols')}</span>
              <input
                type="number"
                min={1}
                max={30}
                value={cols}
                onChange={e => setCols(Number(e.target.value))}
              />
            </label>

            <div className="table-creator-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                {t('tableCreator.cancel')}
              </button>
              <button type="submit" className="btn-primary">
                {t('tableCreator.insert')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
