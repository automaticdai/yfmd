export interface FileEntry {
  name: string
  path: string
  isDir: boolean
  children?: FileEntry[]
}

export interface OpenedFile { path: string; content: string }
export interface OpenedFolder { path: string; tree: FileEntry[] }
export interface OpenedImage { path: string; data: Uint8Array }

export interface FileService {
  openFileDialog(): Promise<OpenedFile | null>
  openFolderDialog(): Promise<OpenedFolder | null>
  readFile(path: string): Promise<string>
  readBinary(path: string): Promise<Uint8Array>
  writeFile(path: string, content: string): Promise<void>
  writeBinary(path: string, data: Uint8Array): Promise<void>
  mkdir(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  remove(path: string): Promise<void>
  listFolder(path: string): Promise<FileEntry[]>
  defaultDir(): Promise<string>
  openImageDialog(): Promise<OpenedImage | null>
  openCssDialog(): Promise<string | null>
  saveFileDialog(defaultName: string): Promise<string | null>
  resolveResource(docPath: string | null, src: string): string
  openExternal(url: string): Promise<void>
}

const MD_EXTENSIONS = ['md', 'markdown', 'mdown', 'txt']

export function isMarkdownFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return name.includes('.') && MD_EXTENSIONS.includes(ext)
}

/** Canonical separators, preserving drive and UNC roots. */
export function normalizePath(p: string): string {
  p = p.replace(/\\/g, '/')
  const root = /^(?:[a-z]:\/|\/\/[^/]+\/[^/]+(?:\/|$)|\/)/i.exec(p)?.[0] ?? ''
  const out: string[] = []
  for (const seg of p.slice(root.length).split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..' && out.length && out[out.length - 1] !== '..') out.pop()
    else if (seg !== '..' || !root) out.push(seg)
  }
  return root + out.join('/')
}

export function isAbsolutePath(p: string): boolean {
  return /^(?:[a-z]:[\\/]|[\\/])/i.test(p)
}

export function dirname(p: string): string {
  p = normalizePath(p)
  const root = /^(?:[a-z]:\/|\/\/[^/]+\/[^/]+(?:\/|$)|\/)/i.exec(p)?.[0] ?? ''
  const i = p.lastIndexOf('/')
  return i < root.length ? root : p.slice(0, i)
}

export function resolveLocalPath(docPath: string | null, src: string): string | null {
  if (isAbsolutePath(src)) return normalizePath(src)
  return docPath ? normalizePath(dirname(docPath).replace(/\/$/, '') + '/' + src) : null
}

/** Build a nested FileEntry tree from absolute paths; dirs first, then alpha. */
export function buildTree(paths: string[]): FileEntry[] {
  const root: FileEntry[] = []
  for (const path of [...paths].sort()) {
    const segs = path.replace(/^\//, '').split('/')
    let level = root
    let cur = ''
    for (let i = 0; i < segs.length; i++) {
      cur += '/' + segs[i]
      const isLeaf = i === segs.length - 1
      let entry = level.find(e => e.name === segs[i])
      if (!entry) {
        entry = { name: segs[i], path: cur, isDir: !isLeaf, ...(isLeaf ? {} : { children: [] }) }
        level.push(entry)
      }
      if (!isLeaf) level = entry.children!
    }
  }
  const sortLevel = (entries: FileEntry[]) => {
    entries.sort((a, b) =>
      a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name))
    for (const e of entries) if (e.children) sortLevel(e.children)
  }
  sortLevel(root)
  return root
}

let cachedService: Promise<FileService> | null = null

/**
 * Memoized: React StrictMode mounts the app effect twice, and a second,
 * un-cached instance would overwrite window.__yfmdFs / native state from its
 * constructor before the (disposed) first call's promise even settles.
 */
export function createFileService(): Promise<FileService> {
  if (!cachedService) {
    cachedService = (async () => {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { TauriFileService } = await import('./tauri-file-service')
        return new TauriFileService()
      }
      const { BrowserFileService } = await import('./browser-file-service')
      return new BrowserFileService()
    })()
  }
  return cachedService
}
