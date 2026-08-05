import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { openUrl } from '@tauri-apps/plugin-opener'
import {
  dirname, type FileEntry, type FileService, normalizePath,
  type OpenedFile, type OpenedFolder,
} from './file-service'

const MD_FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }]

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

  saveFileDialog(defaultName: string): Promise<string | null> {
    return save({ defaultPath: defaultName, filters: MD_FILTERS })
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
