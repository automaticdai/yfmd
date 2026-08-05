import type { ConfirmResult } from './document-controller'

interface Props { fileName: string; onChoice(choice: ConfirmResult): void }

export function ConfirmDialog({ fileName, onChoice }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog">
        <p>Save changes to <strong>{fileName}</strong>?</p>
        <div className="confirm-buttons">
          <button data-choice="save" onClick={() => onChoice('save')}>Save</button>
          <button data-choice="discard" onClick={() => onChoice('discard')}>Don't Save</button>
          <button data-choice="cancel" onClick={() => onChoice('cancel')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
