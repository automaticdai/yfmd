import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { documentDir, join } from '@tauri-apps/api/path'
import { open, save } from '@tauri-apps/plugin-dialog'
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  readTextFile,
  remove as fsRemove,
  rename as fsRename,
  stat,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  resolveLocalPath, type FileEntry, type FileService, normalizePath,
  type OpenedFile, type OpenedFolder, type OpenedImage,
} from './file-service'

const MD_FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }]
const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]
const CSS_FILTERS = [{ name: 'CSS', extensions: ['css'] }]

export class TauriFileService implements FileService {
  /** Grant the path's directory to the fs and asset scopes before touching it. */
  grantAccess(path: string): Promise<void> {
    return invoke('grant_access', { path })
  }

  async openFileDialog(): Promise<OpenedFile | null> {
    const path = await open({ multiple: false, directory: false, filters: MD_FILTERS })
    if (typeof path !== 'string') return null
    await this.grantAccess(path)
    return { path: normalizePath(path), content: await readTextFile(path) }
  }

  async openFolderDialog(): Promise<OpenedFolder | null> {
    const path = await open({ directory: true, multiple: false, recursive: true })
    if (typeof path !== 'string') return null
    return { path: normalizePath(path), tree: await this.listFolder(path) }
  }

  async readFile(path: string): Promise<string> {
    await this.grantAccess(path)
    return readTextFile(path)
  }

  async readBinary(path: string): Promise<Uint8Array> {
    await this.grantAccess(path)
    return fsReadFile(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.grantAccess(path)
    await writeTextFile(path, content)
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    await this.grantAccess(path)
    await writeFile(path, data)
  }

  async mkdir(path: string): Promise<void> {
    await this.grantAccess(path)
    await fsMkdir(path, { recursive: true })
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.grantAccess(oldPath)
    await this.grantAccess(newPath)
    await fsRename(oldPath, newPath)
  }

  async remove(path: string): Promise<void> {
    await this.grantAccess(path)
    await fsRemove(path, { recursive: true })
  }

  async fileMtime(path: string): Promise<number | null> {
    try {
      await this.grantAccess(path)
      const info = await stat(path)
      return info.mtime?.getTime() ?? null
    } catch {
      return null
    }
  }

  async listFolder(path: string): Promise<FileEntry[]> {
    await this.grantAccess(path)
    const normalizeEntries = (entries: FileEntry[]): FileEntry[] => entries.map(entry => ({
      ...entry, path: normalizePath(entry.path),
      ...(entry.children ? { children: normalizeEntries(entry.children) } : {}),
    }))
    return normalizeEntries(await invoke<FileEntry[]>('list_dir', { path }))
  }

  async defaultDir(): Promise<string> {
    return normalizePath(await documentDir())
  }

  async openImageDialog(): Promise<OpenedImage | null> {
    const path = await open({ multiple: false, directory: false, filters: IMAGE_FILTERS })
    if (typeof path !== 'string') return null
    return { path: normalizePath(path), data: await this.readBinary(path) }
  }

  async openCssDialog(): Promise<string | null> {
    const path = await open({ multiple: false, directory: false, filters: CSS_FILTERS })
    if (typeof path !== 'string') return null
    return readTextFile(path)
  }

  async saveFileDialog(defaultName: string): Promise<string | null> {
    // A bare relative `defaultPath` resolves against the process cwd (src-tauri/
    // under `tauri dev`), which dropped stray `untitled.md` files into the tree.
    // Default to the user's Documents directory instead.
    let defaultPath = defaultName
    try {
      defaultPath = await join(await documentDir(), defaultName)
    } catch {
      // documents dir unavailable — fall back to the bare name
    }
    const filters = /\.html$/i.test(defaultName)
      ? [{ name: 'HTML', extensions: ['html'] }] : MD_FILTERS
    const path = await save({ defaultPath, filters })
    return path === null ? null : normalizePath(path)
  }

  resolveResource(docPath: string | null, src: string): string {
    if (/^(https?:|data:|asset:|blob:)/i.test(src)) return src
    const path = resolveLocalPath(docPath, src)
    return path === null ? src : convertFileSrc(path)
  }

  openExternal(url: string): Promise<void> {
    return openUrl(url)
  }
}
