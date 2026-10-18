import { dirname, loadedDirPaths, normalizePath, upsertChildren, type FileEntry, type FileService } from '../services/file-service'
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
  /** True = drop local edits and load the copy on disk. */
  confirmReload(): Promise<boolean>
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
  /** mtime captured at the last successful load or save. */
  private diskMtime: number | null = null
  private diskGone = false
  private promptedMtime: number | null = null
  private checking = false
  /** Set when the file on disk diverged from this buffer. Autosave must not overwrite it. */
  externalChange = false

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
    const loadedRevision = this.revision
    this.diskMtime = this.meta.path ? await this.fs.fileMtime(this.meta.path) : null
    if (request !== this.openRequest) return
    this.externalChange = false
    this.diskGone = false
    this.promptedMtime = null
    if (this.revision === loadedRevision) this.meta.dirty = false
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

  private async refreshTree(revealDir?: string): Promise<void> {
    if (this.meta.folderPath === null) return
    const loaded = new Set(loadedDirPaths(this.meta.tree ?? []))
    if (revealDir) loaded.add(normalizePath(revealDir))
    const root = await this.fs.listFolder(this.meta.folderPath)
    this.meta.tree = await this.hydrate(root, loaded)
    this.emit()
  }

  private async hydrate(entries: FileEntry[], loaded: Set<string>): Promise<FileEntry[]> {
    const out: FileEntry[] = []
    for (const entry of entries) {
      if (entry.isDir && loaded.has(entry.path)) {
        const children = await this.hydrate(await this.fs.listFolder(entry.path), loaded)
        out.push({ ...entry, children })
      } else {
        out.push({ name: entry.name, path: entry.path, isDir: entry.isDir })
      }
    }
    return out
  }

  /** Load one directory level into the open tree. */
  async loadChildren(path: string): Promise<void> {
    path = normalizePath(path)
    if (!this.meta.tree) return
    try {
      await this.fs.grantAccess(path)
      const children = await this.fs.listFolder(path)
      this.meta.tree = upsertChildren(this.meta.tree, path, children)
      this.emit()
    } catch (err) {
      this.host.notify(t('toast.openFolderFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async createFile(path: string): Promise<void> {
    try {
      await this.fs.writeFile(path, '')
      await this.refreshTree(dirname(path))
    } catch (err) {
      this.host.notify(t('toast.createFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  async createFolder(path: string): Promise<void> {
    try {
      await this.fs.mkdir(path)
      await this.refreshTree(dirname(path))
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
      this.diskMtime = await this.fs.fileMtime(path)
      this.externalChange = false
      this.diskGone = false
      this.promptedMtime = null
      this.meta.dirty = revision !== this.revision
      this.emit()
      return !this.meta.dirty
    } catch (err) {
      this.host.notify(t('toast.saveFailed', { error: err instanceof Error ? err.message : String(err) }))
      return false
    }
  }

  async save(opts?: { autosave?: boolean }): Promise<boolean> {
    if (opts?.autosave && this.externalChange) return false
    if (this.meta.path === null) return this.saveAs()
    return this.writeSnapshot(this.meta.path, false)
  }

  /**
   * Compare the open file with disk. A clean buffer reloads. A dirty buffer
   * asks once and refuses autosave until the user saves or reloads.
   */
  async checkDisk(): Promise<'unchanged' | 'reloaded' | 'conflict' | 'missing'> {
    const path = this.meta.path
    if (!path || this.checking) return 'unchanged'
    this.checking = true
    try {
      const mtime = await this.fs.fileMtime(path)
      if (this.meta.path !== path) return 'unchanged'
      if (mtime === null) {
        if (this.diskGone) return 'missing'
        this.diskGone = true
        this.externalChange = true
        if (!this.meta.dirty) {
          this.meta.dirty = true
          this.revision++
        }
        this.emit()
        this.host.notify(t('toast.fileRemoved'))
        return 'missing'
      }
      this.diskGone = false
      if (this.diskMtime === null || mtime === this.diskMtime) {
        this.diskMtime = mtime
        return 'unchanged'
      }
      if (!this.meta.dirty) {
        const content = await this.fs.readFile(path)
        if (this.meta.path !== path) return 'unchanged'
        this.host.setText(content)
        const revision = this.revision
        this.diskMtime = await this.fs.fileMtime(path)
        if (this.meta.path !== path) return 'unchanged'
        this.externalChange = false
        this.promptedMtime = null
        if (this.revision === revision) this.meta.dirty = false
        this.emit()
        this.host.notify(t('toast.reloaded'))
        return 'reloaded'
      }
      this.externalChange = true
      if (this.promptedMtime !== mtime) {
        this.promptedMtime = mtime
        const reload = await this.host.confirmReload()
        if (this.meta.path !== path) return 'conflict'
        if (reload) {
          const content = await this.fs.readFile(path)
          if (this.meta.path !== path) return 'conflict'
          this.host.setText(content)
          const revision = this.revision
          this.diskMtime = await this.fs.fileMtime(path)
          this.externalChange = false
          this.promptedMtime = null
          if (this.revision === revision) this.meta.dirty = false
          this.emit()
          this.host.notify(t('toast.reloaded'))
          return 'reloaded'
        }
      }
      return 'conflict'
    } catch (err) {
      this.host.notify(t('toast.openFailed', { error: err instanceof Error ? err.message : String(err) }))
      return 'unchanged'
    } finally {
      this.checking = false
    }
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
