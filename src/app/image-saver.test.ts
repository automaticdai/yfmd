import { describe, expect, it } from 'vitest'
import type { FileService } from '../services/file-service'
import { makeImageSaver } from './image-saver'

function mockFs(overrides: Partial<FileService> = {}): FileService {
  return {
    openFileDialog: async () => null,
    openFolderDialog: async () => null,
    readFile: async () => '',
    writeFile: async () => {},
    writeBinary: async () => {},
    mkdir: async () => {},
    rename: async () => {},
    remove: async () => {},
    listFolder: async () => [],
    defaultDir: async () => '/docs',
    openImageDialog: async () => null,
    saveFileDialog: async () => null,
    resolveResource: (_d, s) => s,
    openExternal: async () => {},
    ...overrides,
  }
}

describe('makeImageSaver', () => {
  it('saves next to the document and returns a relative src', async () => {
    const written: string[] = []
    const made: string[] = []
    const fs = mockFs({
      writeBinary: async p => { written.push(p) },
      mkdir: async p => { made.push(p) },
    })
    const src = await makeImageSaver(fs, '/notes/readme.md')(new Uint8Array([1]), 'png')
    expect(src).toMatch(/^assets\/image-\d+\.png$/)
    expect(made).toEqual(['/notes/assets'])
    expect(written[0]).toBe('/notes/assets/' + src!.slice('assets/'.length))
  })

  it('uses the default dir for untitled docs and returns an absolute path', async () => {
    const written: string[] = []
    const fs = mockFs({ writeBinary: async p => { written.push(p) } })
    const src = await makeImageSaver(fs, null)(new Uint8Array([1]), 'jpg')
    expect(src).toMatch(/^\/docs\/assets\/image-\d+\.jpg$/)
    expect(written[0]).toBe(src!)
  })

  it('returns null when writing fails', async () => {
    const fs = mockFs({ writeBinary: async () => { throw new Error('nope') } })
    expect(await makeImageSaver(fs, '/a.md')(new Uint8Array([1]), 'png')).toBeNull()
  })
})
