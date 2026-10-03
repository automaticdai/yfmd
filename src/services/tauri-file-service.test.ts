import { expect, it, vi } from 'vitest'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { TauriFileService } from './tauri-file-service'
import capability from '../../src-tauri/capabilities/default.json'

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ readFile: vi.fn(), readTextFile: vi.fn(), writeFile: vi.fn(), writeTextFile: vi.fn(), mkdir: vi.fn(), rename: vi.fn(), remove: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), convertFileSrc: (path: string) => `asset:${path}` }))
vi.mock('@tauri-apps/api/path', () => ({ documentDir: async () => 'C:\\Documents', join: async (...parts: string[]) => parts.join('/') }))
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))

it('imports selected image bytes with the binary-read capability enabled', async () => {
  expect(capability.permissions).toContain('fs:allow-read-file')
  vi.mocked(open).mockResolvedValue('C:\\Pictures\\a.png')
  vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]))
  expect(await new TauriFileService().openImageDialog()).toEqual({ path: 'C:/Pictures/a.png', data: new Uint8Array([1, 2, 3]) })
  expect(readFile).toHaveBeenCalledWith('C:\\Pictures\\a.png')
})

it('normalizes nested native tree entries at the service boundary', async () => {
  vi.mocked(invoke).mockResolvedValue([{ name: 'sub', path: 'C:\\notes\\sub', isDir: true, children: [{ name: 'a.md', path: 'C:\\notes\\sub\\a.md', isDir: false }] }])
  const tree = await new TauriFileService().listFolder('C:/notes')
  expect(tree[0].path).toBe('C:/notes/sub')
  expect(tree[0].children![0].path).toBe('C:/notes/sub/a.md')
})

it('resolves drive and UNC images without treating them as relative paths', () => {
  const fs = new TauriFileService()
  expect(fs.resolveResource('C:/notes/doc.md', 'D:\\images\\a.png')).toBe('asset:D:/images/a.png')
  expect(fs.resolveResource('C:/notes/doc.md', '../a.png')).toBe('asset:C:/a.png')
  expect(fs.resolveResource(null, '\\\\server\\share\\a.png')).toBe('asset://server/share/a.png')
})

it('uses an HTML filter for HTML exports', async () => {
  vi.mocked(save).mockResolvedValue('C:\\Documents\\doc.html')
  expect(await new TauriFileService().saveFileDialog('doc.html')).toBe('C:/Documents/doc.html')
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ name: 'HTML', extensions: ['html'] }] }))
})
