import type { FileService, OpenedFile, OpenedFolder } from './file-service'

/** Placeholder until Task 14 wires the real Tauri plugins; only reachable inside a Tauri shell. */
export class TauriFileService implements FileService {
  private unavailable(): never {
    throw new Error('Tauri file service not implemented yet')
  }
  openFileDialog(): Promise<OpenedFile | null> { this.unavailable() }
  openFolderDialog(): Promise<OpenedFolder | null> { this.unavailable() }
  readFile(): Promise<string> { this.unavailable() }
  writeFile(): Promise<void> { this.unavailable() }
  saveFileDialog(): Promise<string | null> { this.unavailable() }
  resolveResource(_docPath: string | null, src: string): string { return src }
  openExternal(): Promise<void> { this.unavailable() }
}
