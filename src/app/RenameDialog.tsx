import { useEffect, useRef, useState } from 'react'
import { t } from './i18n'

interface Props {
  name: string
  onCancel(): void
  onSubmit(newName: string): void
}

export function RenameDialog({ name, onCancel, onSubmit }: Props) {
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) onSubmit(trimmed)
    else onCancel()
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="rename-dialog">
        <h2>{t('rename.title')}</h2>
        <input
          ref={inputRef}
          className="rename-input"
          value={value}
          autoFocus
          onFocus={e => e.target.select()}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            else if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="rename-actions">
          <button onClick={onCancel}>{t('rename.cancel')}</button>
          <button data-rename="confirm" onClick={submit}>{t('rename.confirm')}</button>
        </div>
      </div>
    </div>
  )
}
