import { useEffect, useRef } from 'react'
import type { ConfirmResult } from './document-controller'
import { t } from './i18n'

interface Props { fileName: string; onChoice(choice: ConfirmResult): void }

export function ConfirmDialog({ fileName, onChoice }: Props) {
  const saveRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { saveRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onChoice('cancel') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChoice])

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <p id="confirm-title">{t('confirm.title', { name: fileName })}</p>
        <div className="confirm-buttons">
          <button data-choice="save" ref={saveRef} onClick={() => onChoice('save')}>{t('confirm.save')}</button>
          <button data-choice="discard" onClick={() => onChoice('discard')}>{t('confirm.dontSave')}</button>
          <button data-choice="cancel" onClick={() => onChoice('cancel')}>{t('confirm.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
