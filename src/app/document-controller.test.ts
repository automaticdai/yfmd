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
  it('newFile can seed the untitled document with content (Markdown guide)', async () => {
    const h = harness()
    await h.controller.newFile('# Guide\n\nhello')
    expect(h.text()).toBe('# Guide\n\nhello')
    expect(h.controller.meta).toMatchObject({ path: null, dirty: false })
  })
  it('newFile with a dirty doc still runs the discard guard', async () => {
    const h = harness(['cancel'])
    h.type('unsaved')
    await h.controller.newFile('# Guide')
    expect(h.text()).toBe('unsaved')          // guard cancelled, doc untouched
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
  it('opens a folder by path into meta', async () => {
    const h = harness()
    await h.fs.writeFile('/notes/x.md', 'x')
    await h.controller.openFolderPath('/notes')
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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

it('keeps newer edits dirty when a save finishes', async () => {
  const h = harness()
  h.controller.meta.path = '/a.md'
  h.type('snapshot')
  const gate = deferred<void>()
  h.fs.writeFile = async (path, content) => { await gate.promise; h.fs.files.set(path, content) }
  const saving = h.controller.save()
  h.type('newer text')
  gate.resolve()
  expect(await saving).toBe(false)
  expect(h.fs.files.get('/a.md')).toBe('snapshot')
  expect(h.controller.meta.dirty).toBe(true)
})

it('serializes overlapping saves so the newest snapshot stays on disk', async () => {
  const h = harness()
  h.controller.meta.path = '/a.md'
  const first = deferred<void>()
  let calls = 0
  h.fs.writeFile = async (path, content) => {
    if (++calls === 1) await first.promise
    h.fs.files.set(path, content)
  }
  h.type('first')
  const a = h.controller.save()
  h.type('second')
  const b = h.controller.save()
  first.resolve()
  await Promise.all([a, b])
  expect(h.fs.files.get('/a.md')).toBe('second')
  expect(h.controller.meta.dirty).toBe(false)
})

it('does not clear a different document when an old save finishes', async () => {
  const h = harness()
  h.controller.meta.path = '/a.md'
  h.type('A')
  const gate = deferred<void>()
  h.fs.writeFile = () => gate.promise
  const saving = h.controller.save()
  await h.controller.newFile()
  h.type('B')
  gate.resolve()
  expect(await saving).toBe(false)
  expect(h.controller.meta).toMatchObject({ path: null, dirty: true })
})

it('asks again about edits made while opening a file', async () => {
  const h = harness(['cancel'])
  const read = deferred<string>()
  h.fs.readFile = () => read.promise
  const opening = h.controller.openPath('/b.md')
  await Promise.resolve()
  h.type('keep this edit')
  read.resolve('B')
  await opening
  expect(h.text()).toBe('keep this edit')
  expect(h.controller.meta.dirty).toBe(true)
})

it('ignores an older open completing after a newer one', async () => {
  const h = harness()
  const a = deferred<string>()
  h.fs.readFile = path => path === '/a.md' ? a.promise : Promise.resolve('B')
  const opening = h.controller.openPath('/a.md')
  await Promise.resolve()
  await h.controller.openPath('/b.md')
  a.resolve('A')
  await opening
  expect(h.text()).toBe('B')
  expect(h.controller.meta.path).toBe('/b.md')
})

it('does not close through a save guard when edits arrive during the write', async () => {
  const h = harness(['save'])
  h.controller.meta.path = '/a.md'
  h.type('A')
  const started = deferred<void>()
  const gate = deferred<void>()
  h.fs.writeFile = () => { started.resolve(); return gate.promise }
  const guarded = h.controller.guardDirty()
  await started.promise
  h.type('newer')
  gate.resolve()
  expect(await guarded).toBe(false)
})

it('abandons save-as if the document changes while its dialog is open', async () => {
  const h = harness()
  const dialog = deferred<string | null>()
  h.fs.saveFileDialog = () => dialog.promise
  const saving = h.controller.saveAs()
  await h.controller.newFile('new document')
  dialog.resolve('/old.md')
  expect(await saving).toBe(false)
  expect(h.fs.files.has('/old.md')).toBe(false)
  expect(h.controller.meta.path).toBeNull()
})

it('normalizes Windows input and tracks documents inside renamed directories', async () => {
  const h = harness()
  h.fs.files.set('C:/notes/sub/a.md', 'A')
  await h.controller.openPath('C:\\notes\\sub\\a.md')
  await h.controller.renamePath('C:\\notes', 'C:\\renamed')
  expect(h.controller.meta.path).toBe('C:/renamed/sub/a.md')
  await h.controller.deletePath('C:\\renamed')
  expect(h.controller.meta.path).toBeNull()
})
