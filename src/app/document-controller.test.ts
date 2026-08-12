import { describe, expect, it } from 'vitest'
import { BrowserFileService } from '../services/browser-file-service'
import { type ConfirmResult, type DocMeta, DocumentController } from './document-controller'

function harness(confirmAnswers: ConfirmResult[] = []) {
  const fs = new BrowserFileService()
  let text = ''
  const metas: DocMeta[] = []
  const controller = new DocumentController(fs, {
    getText: () => text,
    setText: t => { text = t },
    confirmDiscard: async () => confirmAnswers.shift() ?? 'discard',
    notify: () => {},
    onMetaChange: m => metas.push({ ...m }),
  })
  return { fs, controller, metas, text: () => text, type: (t: string) => { text = t; controller.markDirty() } }
}

describe('DocumentController', () => {
  it('opens a file and clears dirty', async () => {
    const h = harness()
    await h.fs.writeFile('/a.md', '# A')
    h.fs.dialogQueue.push('/a.md')
    await h.controller.openFileViaDialog()
    expect(h.text()).toBe('# A')
    expect(h.controller.meta).toMatchObject({ path: '/a.md', dirty: false })
  })
  it('marks dirty on edit and saves to the same path', async () => {
    const h = harness()
    await h.fs.writeFile('/a.md', 'old')
    h.fs.dialogQueue.push('/a.md')
    await h.controller.openFileViaDialog()
    h.type('new content')
    expect(h.controller.meta.dirty).toBe(true)
    expect(await h.controller.save()).toBe(true)
    expect(await h.fs.readFile('/a.md')).toBe('new content')
    expect(h.controller.meta.dirty).toBe(false)
  })
  it('save on an untitled doc runs save-as', async () => {
    const h = harness()
    h.type('draft')
    h.fs.dialogQueue.push('/draft.md')
    expect(await h.controller.save()).toBe(true)
    expect(await h.fs.readFile('/draft.md')).toBe('draft')
    expect(h.controller.meta.path).toBe('/draft.md')
  })
  it('guardDirty cancel blocks switching', async () => {
    const h = harness(['cancel'])
    await h.fs.writeFile('/a.md', 'A')
    h.type('unsaved')
    h.fs.dialogQueue.push('/a.md')
    await h.controller.openFileViaDialog()
    expect(h.text()).toBe('unsaved')          // still the dirty doc
  })
  it('guardDirty save persists before switching', async () => {
    const h = harness(['save'])
    await h.fs.writeFile('/a.md', 'A')
    h.type('keep me')
    h.fs.dialogQueue.push('/keep.md', '/a.md') // save-as answer, then open answer
    await h.controller.openFileViaDialog()
    expect(await h.fs.readFile('/keep.md')).toBe('keep me')
    expect(h.text()).toBe('A')
  })
  it('opens folders into meta', async () => {
    const h = harness()
    await h.fs.writeFile('/notes/x.md', 'x')
    h.fs.dialogQueue.push('/notes')
    await h.controller.openFolderViaDialog()
    expect(h.controller.meta.folderPath).toBe('/notes')
    expect(h.controller.meta.tree!.map(e => e.name)).toEqual(['x.md'])
  })
  it('creates a file in the open folder and refreshes the tree', async () => {
    const h = harness()
    await h.fs.writeFile('/notes/x.md', 'x')
    h.fs.dialogQueue.push('/notes')
    await h.controller.openFolderViaDialog()
    await h.controller.createFile('/notes/new.md')
    expect(await h.fs.readFile('/notes/new.md')).toBe('')
    expect(h.controller.meta.tree!.map(e => e.name)).toEqual(['new.md', 'x.md'])
  })
  it('renames a file and updates the open document path', async () => {
    const h = harness()
    await h.fs.writeFile('/notes/a.md', 'A')
    h.fs.dialogQueue.push('/notes/a.md')
    await h.controller.openFileViaDialog()
    h.fs.dialogQueue.push('/notes')
    await h.controller.openFolderViaDialog()
    await h.controller.renamePath('/notes/a.md', '/notes/renamed.md')
    expect(h.controller.meta.path).toBe('/notes/renamed.md')
    expect(await h.fs.readFile('/notes/renamed.md')).toBe('A')
    expect(h.fs.files.has('/notes/a.md')).toBe(false)
  })
  it('deletes a file and clears the open path when it was the open doc', async () => {
    const h = harness()
    await h.fs.writeFile('/notes/a.md', 'A')
    h.fs.dialogQueue.push('/notes/a.md')
    await h.controller.openFileViaDialog()
    h.fs.dialogQueue.push('/notes')
    await h.controller.openFolderViaDialog()
    await h.controller.deletePath('/notes/a.md')
    expect(h.controller.meta.path).toBeNull()
    expect(h.fs.files.has('/notes/a.md')).toBe(false)
  })
  it('surfaces read errors via notify without changing the doc', async () => {
    const messages: string[] = []
    const fs = new BrowserFileService()
    let text = 'current'
    const c = new DocumentController(fs, {
      getText: () => text,
      setText: t => { text = t },
      confirmDiscard: async () => 'discard',
      notify: m => messages.push(m),
      onMetaChange: () => {},
    })
    await c.openPath('/missing.md')
    expect(text).toBe('current')
    expect(messages.some(m => /missing\.md/.test(m))).toBe(true)
  })
})
