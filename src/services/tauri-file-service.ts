import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { documentDir, join } from '@tauri-apps/api/path'
import { open, save } from '@tauri-apps/plugin-dialog'
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  readTextFile,
  remove as fsRemove,
  rename as fsRename,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  dirname, type FileEntry, type FileService, normalizePath,
  type OpenedFile, type OpenedFolder, type OpenedImage,
} from './file-service'

const MD_FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }]
const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }]

export class TauriFileService implements FileService {
  async openFileDialog(): Promise<OpenedFile | null> {
    const path = await open({ multiple: false, directory: false, filters: MD_FILTERS })
    if (typeof path !== 'string') return null
    return { path, content: await readTextFile(path) }
  }

  async openFolderDialog(): Promise<OpenedFolder | null> {
    const path = await open({ directory: true, multiple: false })
    if (typeof path !== 'string') return null
    return { path, tree: await invoke<FileEntry[]>('list_dir', { path }) }
  }

  readFile(path: string): Promise<string> {
    return readTextFile(path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content)
  }

  async writeBinary(path: string, data: Uint8Array): Promise<void> {
    await writeFile(path, data)
  }

  async mkdir(path: string): Promise<void> {
    await fsMkdir(path, { recursive: true })
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsRename(oldPath, newPath)
  }

  async remove(path: string): Promise<void> {
    await fsRemove(path, { recursive: true })
  }

  async listFolder(path: string): Promise<FileEntry[]> {
    return invoke<FileEntry[]>('list_dir', { path })
  }

  async defaultDir(): Promise<string> {
    return documentDir()
  }

  async openImageDialog(): Promise<OpenedImage | null> {
    const path = await open({ multiple: false, directory: false, filters: IMAGE_FILTERS })
    if (typeof path !== 'string') return null
    return { path, data: await fsReadFile(path) }
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
    return save({ defaultPath, filters: MD_FILTERS })
  }

  resolveResource(docPath: string | null, src: string): string {
    if (/^(https?:|data:|asset:|blob:)/i.test(src)) return src
    if (src.startsWith('/')) return convertFileSrc(normalizePath(src))
    if (!docPath) return src
    return convertFileSrc(normalizePath(dirname(docPath) + '/' + src))
  }

  openExternal(url: string): Promise<void> {
    return openUrl(url)
  }
}
