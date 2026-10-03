import { normalizePath, type FileEntry, type FileService } from '../services/file-service'
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

  private revision = 0
  private documentId = 0
  private openRequest = 0
  private confirmation: Promise<ConfirmResult> | null = null
  private writes: Promise<unknown> = Promise.resolve()

  constructor(private fs: FileService, private host: DocHost) {}

  private emit() { this.host.onMetaChange(this.meta) }

  markDirty(): void {
    this.revision++
    if (!this.meta.dirty) {
      this.meta.dirty = true
      this.emit()
    }
  }

  /** True = safe to replace the current document (may save first). */
  async guardDirty(): Promise<boolean> {
    if (!this.meta.dirty) return true
    const revision = this.revision
    const documentId = this.documentId
    this.confirmation ??= this.host.confirmDiscard().finally(() => { this.confirmation = null })
    const choice = await this.confirmation
    if (documentId !== this.documentId || revision !== this.revision) return false
    if (choice === 'cancel') return false
    if (choice === 'save') return this.save()
    return true
  }

  private async replaceDocument(load: () => Promise<{ path: string | null; content: string } | null>): Promise<void> {
    const request = ++this.openRequest
    if (!(await this.guardDirty()) || request !== this.openRequest) return
    const revision = this.revision
    const opened = await load()
    if (!opened || request !== this.openRequest) return
    // Loading/dialogs leave the editor usable. Ask again if it changed meanwhile.
    if (revision !== this.revision && !(await this.guardDirty())) return
    if (request !== this.openRequest) return
    this.documentId++
    this.revision++
    this.meta.path = opened.path === null ? null : normalizePath(opened.path)
    this.host.setText(opened.content)
    this.meta.dirty = false
    if (this.meta.path) addRecent(this.meta.path)
    this.emit()
  }

  /** Start a fresh untitled document, optionally pre-filled. */
  async newFile(content = ''): Promise<void> {
    await this.replaceDocument(async () => ({ path: null, content }))
  }

  async openFileViaDialog(): Promise<void> {
    try {
      await this.replaceDocument(() => this.fs.openFileDialog())
    } catch (err) {
      this.host.notify(t('toast.openFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async openPath(path: string): Promise<void> {
    path = normalizePath(path)
    try {
      await this.replaceDocument(async () => ({ path, content: await this.fs.readFile(path) }))
    } catch (err) {
      this.host.notify(t('toast.openFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async openFolderViaDialog(): Promise<void> {
    const folder = await this.fs.openFolderDialog()
    if (!folder) return
    await this.openFolderPath(folder.path)
  }

  async openFolderPath(path: string): Promise<void> {
    path = normalizePath(path)
    try {
      const tree = await this.fs.listFolder(path)
      this.meta.folderPath = path
      this.meta.tree = tree
      this.emit()
    } catch (err) {
      this.host.notify(t('toast.openFolderFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  private isWithin(path: string | null, base: string): boolean {
    return path !== null && (path === base || path.startsWith(base.replace(/\/$/, '') + '/'))
  }

  private async refreshTree(): Promise<void> {
    if (this.meta.folderPath === null) return
    this.meta.tree = await this.fs.listFolder(this.meta.folderPath)
    this.emit()
  }

  async createFile(path: string): Promise<void> {
    try {
      await this.fs.writeFile(path, '')
      await this.refreshTree()
    } catch (err) {
      this.host.notify(t('toast.createFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async createFolder(path: string): Promise<void> {
    try {
      await this.fs.mkdir(path)
      await this.refreshTree()
    } catch (err) {
      this.host.notify(t('toast.createFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async renamePath(oldPath: string, newPath: string): Promise<void> {
    oldPath = normalizePath(oldPath)
    newPath = normalizePath(newPath)
    try {
      await this.fs.rename(oldPath, newPath)
      if (this.isWithin(this.meta.path, oldPath)) {
        this.meta.path = newPath + this.meta.path!.slice(oldPath.length)
      }
      await this.refreshTree()
    } catch (err) {
      this.host.notify(t('toast.renameFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async deletePath(path: string): Promise<void> {
    path = normalizePath(path)
    try {
      await this.fs.remove(path)
      if (this.isWithin(this.meta.path, path)) this.meta.path = null
      await this.refreshTree()
    } catch (err) {
      this.host.notify(t('toast.deleteFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  private async writeSnapshot(path: string, saveAs: boolean): Promise<boolean> {
    const documentId = this.documentId
    const revision = this.revision
    const originalPath = this.meta.path
    const text = this.host.getText()
    // Preserve write order so a slow older save cannot overwrite a newer save.
    const write = this.writes.then(() => this.fs.writeFile(path, text))
    this.writes = write.catch(() => {})
    try {
      await write
      if (documentId !== this.documentId || originalPath !== this.meta.path) return false
      if (saveAs) {
        this.meta.path = path
        addRecent(path)
      }
      this.meta.dirty = revision !== this.revision
      this.emit()
      return !this.meta.dirty
    } catch (err) {
      this.host.notify(t('toast.saveFailed', { error: err instanceof Error ? err.message : String(err) }))
      return false
    }
  }

  async save(): Promise<boolean> {
    if (this.meta.path === null) return this.saveAs()
    return this.writeSnapshot(this.meta.path, false)
  }

  async saveAs(): Promise<boolean> {
    const documentId = this.documentId
    const originalPath = this.meta.path
    try {
      const path = await this.fs.saveFileDialog('untitled.md')
      if (path === null || documentId !== this.documentId || originalPath !== this.meta.path) return false
      return await this.writeSnapshot(normalizePath(path), true)
    } catch (err) {
      this.host.notify(t('toast.saveFailed', { error: err instanceof Error ? err.message : String(err) }))
      return false
    }
  }
}
