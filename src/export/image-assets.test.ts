import { expect, it, vi } from 'vitest'
import { BrowserFileService } from '../services/browser-file-service'
import { exportImageResolver } from './image-assets'

it('embeds local image bytes relative to the source document, decoding URLs', async () => {
  const fs = new BrowserFileService()
  await fs.writeBinary('/notes/assets/my image.png', new Uint8Array([0, 127, 255]))
  const read = vi.spyOn(fs, 'readBinary')
  const resolve = exportImageResolver(fs, '/notes/doc.md')
  expect(await resolve('assets/my%20image.png')).toBe('data:image/png;base64,AH//')
  await resolve('assets/my%20image.png')
  expect(read).toHaveBeenCalledTimes(1)
})

it('supports drive-letter and UNC document locations and absolute images in untitled docs', async () => {
  const fs = new BrowserFileService()
  await fs.writeBinary('C:/notes/assets/a.jpg', new Uint8Array([1]))
  await fs.writeBinary('//server/share/assets/a.gif', new Uint8Array([2]))
  expect(await exportImageResolver(fs, 'C:\\notes\\doc.md')('assets/a.jpg')).toBe('data:image/jpeg;base64,AQ==')
  expect(await exportImageResolver(fs, '\\\\server\\share\\doc.md')('assets/a.gif')).toBe('data:image/gif;base64,Ag==')
  expect(await exportImageResolver(fs, null)('C:/notes/assets/a.jpg')).toBe('data:image/jpeg;base64,AQ==')
})

it('keeps SVG fragments and encodes large images without exceeding argument limits', async () => {
  const fs = new BrowserFileService()
  await fs.writeBinary('/assets/a.svg', new TextEncoder().encode('<svg/>'))
  expect(await exportImageResolver(fs, '/doc.md')('assets/a.svg#icon')).toBe('data:image/svg+xml;base64,PHN2Zy8+#icon')
  const bytes = new Uint8Array(200_000).fill(255)
  await fs.writeBinary('/assets/a.png', bytes)
  const url = await exportImageResolver(fs, '/doc.md')('assets/a.png')
  expect(atob(url.split(',')[1]).length).toBe(bytes.length)
})

it('leaves remote and already embedded images alone', async () => {
  const fs = new BrowserFileService()
  const read = vi.spyOn(fs, 'readBinary')
  const resolve = exportImageResolver(fs, null)
  for (const src of ['https://example.com/a.png', '//example.com/a.png', 'data:image/png;base64,AQ==', 'blob:example']) {
    expect(await resolve(src)).toBe(src)
  }
  expect(read).not.toHaveBeenCalled()
})

it('fails explicitly instead of exporting broken local image references', async () => {
  const fs = new BrowserFileService()
  await expect(exportImageResolver(fs, null)('assets/a.png')).rejects.toThrow('Save the document')
  await expect(exportImageResolver(fs, '/doc.md')('missing.png')).rejects.toThrow('File not found')
})
