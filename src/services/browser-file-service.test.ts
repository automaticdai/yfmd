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

  it('lists a folder tree with dirs first', async () => {
    const fs = makeFs()
    const tree = await fs.listFolder('/a')
    expect(tree.map(e => e.name)).toEqual(['b', 'x.md'])
    expect(tree[0].children?.map(c => c.name)).toEqual(['y.md'])
    expect(tree[0].children?.[0].path).toBe('/a/b/y.md')
  })
})
