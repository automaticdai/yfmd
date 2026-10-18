import welcome from '../assets/welcome.md?raw'
import {
  listOneLevel, normalizePath, type FileEntry, type FileService, type OpenedFile, type OpenedFolder,
  type OpenedImage,
} from './file-service'

/**
 * In-memory FileService for browser dev and e2e tests.
 * Dialogs are answered from `dialogQueue` (paths pushed by tests); an empty
 * queue falls back to the first markdown file / a generated untitled path.
 */
export class BrowserFileService implements FileService {
  files = new Map<string, string>([['/welcome.md', welcome]])
  /** Explicit directories, including empty ones. File paths also imply their parents. */
  dirs = new Set<string>()
  mtimes = new Map<string, number>()
  dialogQueue: (string | null)[] = []
  private untitledCounter = 0
  private mtimeClock = 1

  constructor() {
    if (typeof window !== 'undefined') {
      ;(window as unknown as Record<string, unknown>).__yfmdFs = this
    }
  }

  private nextAnswer(fallback: string | null): string | null {
    return this.dialogQueue.length > 0 ? this.dialogQueue.shift()! : fallback
  }

  private bump(path: string): void {
    this.mtimeClock += 1
    this.mtimes.set(path, this.mtimeClock)
  }

  private listTree(path: string): FileEntry[] {
    return listOneLevel(path, [...this.files.keys()], [...this.dirs])
  }

  async openFileDialog(): Promise<OpenedFile | null> {
    const path = this.nextAnswer([...this.files.keys()][0] ?? null)
    if (path === null) return null
    return { path, content: await this.readFile(path) }
  }

  async openFolderDialog(): Promise<OpenedFolder | null> {
    const path = this.nextAnswer('/')
    if (path === null) return null
    return { path, tree: this.listTree(path) }
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`File not found: ${path}`)
    return content
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const encoded = await this.readFile(path)
    return Uint8Array.from(atob(encoded), char => char.charCodeAt(0))
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(normalizePath(path), content)
    this.bump(normalizePath(path))
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    let bin = ''
    for (const b of data) bin += String.fromCharCode(b)
    const key = normalizePath(path)
    this.files.set(key, btoa(bin))
    this.bump(key)
  }

  async mkdir(path: string): Promise<void> {
    this.dirs.add(normalizePath(path))
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    oldPath = normalizePath(oldPath)
    newPath = normalizePath(newPath)
    const toMove = [...this.files.keys()].filter(p => p === oldPath || p.startsWith(oldPath + '/'))
    for (const p of toMove) {
      const next = newPath + p.slice(oldPath.length)
      this.files.set(next, this.files.get(p)!)
      this.files.delete(p)
      const mtime = this.mtimes.get(p)
      if (mtime !== undefined) {
        this.mtimes.set(next, mtime)
        this.mtimes.delete(p)
      }
    }
    const nextDirs = new Set<string>()
    for (const dir of this.dirs) {
      if (dir === oldPath || dir.startsWith(oldPath + '/')) nextDirs.add(newPath + dir.slice(oldPath.length))
      else nextDirs.add(dir)
    }
    this.dirs = nextDirs
  }

  async remove(path: string): Promise<void> {
    path = normalizePath(path)
    for (const p of [...this.files.keys()]) {
      if (p === path || p.startsWith(path + '/')) {
        this.files.delete(p)
        this.mtimes.delete(p)
      }
    }
    for (const dir of [...this.dirs]) {
      if (dir === path || dir.startsWith(path + '/')) this.dirs.delete(dir)
    }
  }

  async listFolder(path: string): Promise<FileEntry[]> {
    return this.listTree(path)
  }

  async fileMtime(path: string): Promise<number | null> {
    path = normalizePath(path)
    if (!this.files.has(path)) return null
    if (!this.mtimes.has(path)) this.bump(path)
    return this.mtimes.get(path) ?? null
  }

  async grantAccess(_path: string): Promise<void> {
    // the browser store has no capability scope
  }

  async defaultDir(): Promise<string> {
    return '/'
  }

  async openImageDialog(): Promise<OpenedImage | null> {
    const path = this.nextAnswer(null)
    if (path === null) return null
    return { path, data: new Uint8Array() }
  }

  async openCssDialog(): Promise<string | null> {
    const path = this.nextAnswer(null)
    if (path === null) return null
    return this.readFile(path)
  }

  async saveFileDialog(defaultName: string): Promise<string | null> {
    return this.nextAnswer(`/untitled-${++this.untitledCounter}-${defaultName}`)
  }

  resolveResource(_docPath: string | null, src: string): string {
    return src
  }

  async openExternal(url: string): Promise<void> {
    window.open(url, '_blank', 'noopener')
  }
}
