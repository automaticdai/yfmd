import type { ConfirmResult } from './document-controller'
import { t } from './i18n'

interface Props { fileName: string; onChoice(choice: ConfirmResult): void }

export function ConfirmDialog({ fileName, onChoice }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog">
        <p>{t('confirm.title', { name: fileName })}</p>
        <div className="confirm-buttons">
          <button data-choice="save" onClick={() => onChoice('save')}>{t('confirm.save')}</button>
          <button data-choice="discard" onClick={() => onChoice('discard')}>{t('confirm.dontSave')}</button>
          <button data-choice="cancel" onClick={() => onChoice('cancel')}>{t('confirm.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
