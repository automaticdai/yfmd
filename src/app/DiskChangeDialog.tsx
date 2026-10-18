import { useEffect, useRef } from 'react'
import { t } from './i18n'

interface Props {
  fileName: string
  onChoice(reload: boolean): void
}

export function DiskChangeDialog({ fileName, onChoice }: Props) {
  const keepRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { keepRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChoice(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChoice])

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="disk-change-title">
        <p id="disk-change-title">{t('diskChange.title', { name: fileName })}</p>
        <div className="confirm-buttons">
          <button data-choice="reload" onClick={() => onChoice(true)}>{t('diskChange.reload')}</button>
          <button data-choice="keep" ref={keepRef} onClick={() => onChoice(false)}>{t('diskChange.keep')}</button>
        </div>
      </div>
    </div>
  )
}
