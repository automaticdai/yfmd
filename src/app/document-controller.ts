import type { FileEntry, FileService } from '../services/file-service'
import { t } from './i18n'
import { addRecent } from './recent-files'

export type ConfirmResult = 'save' | 'discard' | 'cancel'

export interface DocMeta {
  path: string | null
  dirty: boolean
  folderPath: string | null
  tree: FileEntry[] | null
}

export interface DocHost {
  getText(): string
  setText(text: string): void
  confirmDiscard(): Promise<ConfirmResult>
  notify(message: string): void
  onMetaChange(meta: DocMeta): void
}

export class DocumentController {
  readonly meta: DocMeta = { path: null, dirty: false, folderPath: null, tree: null }

  constructor(private fs: FileService, private host: DocHost) {}

  private emit() { this.host.onMetaChange(this.meta) }

  markDirty(): void {
    if (!this.meta.dirty) {
      this.meta.dirty = true
      this.emit()
    }
  }

  /** True = safe to replace the current document (may save first). */
  async guardDirty(): Promise<boolean> {
    if (!this.meta.dirty) return true
    const choice = await this.host.confirmDiscard()
    if (choice === 'cancel') return false
    if (choice === 'save') return this.save()
    return true
  }

  async newFile(): Promise<void> {
    if (!(await this.guardDirty())) return
    this.host.setText('')
    this.meta.path = null
    this.meta.dirty = false
    this.emit()
  }

  async openFileViaDialog(): Promise<void> {
    if (!(await this.guardDirty())) return
    try {
      const opened = await this.fs.openFileDialog()
      if (!opened) return
      this.host.setText(opened.content)
      this.meta.path = opened.path
      this.meta.dirty = false
      addRecent(opened.path)
      this.emit()
    } catch (err) {
      this.host.notify(t('toast.openFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async openPath(path: string): Promise<void> {
    if (!(await this.guardDirty())) return
    try {
      const content = await this.fs.readFile(path)
      this.host.setText(content)
      this.meta.path = path
      this.meta.dirty = false
      addRecent(path)
      this.emit()
    } catch (err) {
      this.host.notify(t('toast.openFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async openFolderViaDialog(): Promise<void> {
    try {
      const folder = await this.fs.openFolderDialog()
      if (!folder) return
      this.meta.folderPath = folder.path
      this.meta.tree = folder.tree
      this.emit()
    } catch (err) {
      this.host.notify(t('toast.openFolderFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async save(): Promise<boolean> {
    if (this.meta.path === null) return this.saveAs()
    try {
      await this.fs.writeFile(this.meta.path, this.host.getText())
      this.meta.dirty = false
      this.emit()
      return true
    } catch (err) {
      this.host.notify(t('toast.saveFailed', { error: err instanceof Error ? err.message : String(err) }))
      return false
    }
  }

  async saveAs(): Promise<boolean> {
    try {
      const path = await this.fs.saveFileDialog('untitled.md')
      if (path === null) return false
      await this.fs.writeFile(path, this.host.getText())
      this.meta.path = path
      this.meta.dirty = false
      addRecent(path)
      this.emit()
      return true
    } catch (err) {
      this.host.notify(t('toast.saveFailed', { error: err instanceof Error ? err.message : String(err) }))
      return false
    }
  }
}
