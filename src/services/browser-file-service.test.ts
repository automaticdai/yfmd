import { describe, expect, it } from 'vitest'
import { BrowserFileService } from './browser-file-service'

function makeFs(): BrowserFileService {
  const fs = new BrowserFileService()
  fs.files.clear()
  fs.files.set('/a/x.md', 'x')
  fs.files.set('/a/b/y.md', 'y')
  return fs
}

describe('BrowserFileService file operations', () => {
  it('renames a folder and its children', async () => {
    const fs = makeFs()
    await fs.rename('/a', '/c')
    expect(fs.files.get('/c/x.md')).toBe('x')
    expect(fs.files.get('/c/b/y.md')).toBe('y')
    expect(fs.files.has('/a/x.md')).toBe(false)
  })

  it('removes a folder and its children', async () => {
    const fs = makeFs()
    await fs.remove('/a/b')
    expect(fs.files.has('/a/b/y.md')).toBe(false)
    expect(fs.files.get('/a/x.md')).toBe('x')
  })

  it('lists one level and leaves subdirectories unloaded', async () => {
    const fs = makeFs()
    const tree = await fs.listFolder('/a')
    expect(tree.map(e => e.name)).toEqual(['b', 'x.md'])
    expect(tree[0].isDir).toBe(true)
    expect(tree[0].children).toBeUndefined()
    const nested = await fs.listFolder('/a/b')
    expect(nested.map(e => e.name)).toEqual(['y.md'])
    expect(nested[0].path).toBe('/a/b/y.md')
  })

  it('lists an empty directory created with mkdir', async () => {
    const fs = makeFs()
    await fs.mkdir('/a/empty')
    const tree = await fs.listFolder('/a')
    expect(tree.map(e => e.name)).toEqual(['b', 'empty', 'x.md'])
  })

  it('bumps mtime on write and reports null for a missing file', async () => {
    const fs = makeFs()
    const before = await fs.fileMtime('/a/x.md')
    await fs.writeFile('/a/x.md', 'changed')
    expect(await fs.fileMtime('/a/x.md')).toBeGreaterThan(before ?? 0)
    expect(await fs.fileMtime('/missing.md')).toBeNull()
  })
})
