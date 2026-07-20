import { describe, expect, it } from 'vitest'
import { buildTree, dirname, isMarkdownFile, normalizePath } from './file-service'
import { BrowserFileService } from './browser-file-service'

describe('path helpers', () => {
  it('detects markdown files', () => {
    expect(isMarkdownFile('a.md')).toBe(true)
    expect(isMarkdownFile('B.MARKDOWN')).toBe(true)
    expect(isMarkdownFile('c.txt')).toBe(true)
    expect(isMarkdownFile('d.png')).toBe(false)
  })
  it('normalizes paths', () => {
    expect(normalizePath('/a/b/../c/./d.md')).toBe('/a/c/d.md')
    expect(normalizePath('/a//b.md')).toBe('/a/b.md')
  })
  it('dirname', () => {
    expect(dirname('/a/b/c.md')).toBe('/a/b')
    expect(dirname('c.md')).toBe('')
  })
})

describe('buildTree', () => {
  it('nests folders and sorts dirs first', () => {
    const tree = buildTree(['/docs/z.md', '/docs/sub/a.md', '/readme.md'])
    expect(tree.map(e => e.name)).toEqual(['docs', 'readme.md'])
    const docs = tree[0]
    expect(docs.isDir).toBe(true)
    expect(docs.children!.map(e => e.name)).toEqual(['sub', 'z.md'])
    expect(docs.children![0].children![0].path).toBe('/docs/sub/a.md')
  })
})

describe('BrowserFileService', () => {
  it('reads and writes in-memory files', async () => {
    const fs = new BrowserFileService()
    await fs.writeFile('/notes/a.md', '# A')
    expect(await fs.readFile('/notes/a.md')).toBe('# A')
    await expect(fs.readFile('/missing.md')).rejects.toThrow(/not found/i)
  })
  it('answers dialogs from the queue', async () => {
    const fs = new BrowserFileService()
    await fs.writeFile('/notes/a.md', '# A')
    fs.dialogQueue.push('/notes/a.md', null)
    expect(await fs.openFileDialog()).toEqual({ path: '/notes/a.md', content: '# A' })
    expect(await fs.openFileDialog()).toBeNull()
  })
  it('opens folders as trees scoped to the folder', async () => {
    const fs = new BrowserFileService()
    await fs.writeFile('/notes/a.md', 'a')
    await fs.writeFile('/notes/sub/b.md', 'b')
    await fs.writeFile('/other/c.md', 'c')
    fs.dialogQueue.push('/notes')
    const folder = await fs.openFolderDialog()
    expect(folder!.path).toBe('/notes')
    expect(folder!.tree.map(e => e.name)).toEqual(['sub', 'a.md'])
  })
})
