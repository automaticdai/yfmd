import welcome from '../assets/welcome.md?raw'
import {
  buildTree, type FileEntry, type FileService, type OpenedFile, type OpenedFolder,
} from './file-service'

/**
 * In-memory FileService for browser dev and e2e tests.
 * Dialogs are answered from `dialogQueue` (paths pushed by tests); an empty
 * queue falls back to the first markdown file / a generated untitled path.
 */
export class BrowserFileService implements FileService {
  files = new Map<string, string>([['/welcome.md', welcome]])
  dialogQueue: (string | null)[] = []
  private untitledCounter = 0

  constructor() {
    if (typeof window !== 'undefined') {
      ;(window as unknown as Record<string, unknown>).__yfmdFs = this
    }
  }

  private nextAnswer(fallback: string | null): string | null {
    return this.dialogQueue.length > 0 ? this.dialogQueue.shift()! : fallback
  }

  async openFileDialog(): Promise<OpenedFile | null> {
    const path = this.nextAnswer([...this.files.keys()][0] ?? null)
    if (path === null) return null
    return { path, content: await this.readFile(path) }
  }

  async openFolderDialog(): Promise<OpenedFolder | null> {
    const path = this.nextAnswer('/')
    if (path === null) return null
    const prefix = path === '/' ? '/' : path + '/'
    const inside = [...this.files.keys()].filter(p => p.startsWith(prefix))
    const rel = inside.map(p => '/' + p.slice(prefix.length))
    const tree = buildTree(rel)
    const fix = (entries: FileEntry[]): FileEntry[] =>
      entries.map(e => ({
        ...e,
        path: (path === '/' ? '' : path) + e.path,
        children: e.children ? fix(e.children) : undefined,
      }))
    return { path, tree: fix(tree) }
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path)
    if (content === undefined) throw new Error(`File not found: ${path}`)
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content)
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
