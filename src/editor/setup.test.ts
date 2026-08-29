import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { syntaxTree } from '@codemirror/language'
import { createExtensions, readOnlyExtensions } from './setup'

const noop = { onDocChanged() {}, onToggleSource() {}, openExternal() {} }

describe('createExtensions', () => {
  it('creates a state that parses markdown', () => {
    const state = EditorState.create({ doc: '# Hi\n**bold**', extensions: createExtensions(noop) })
    const names: string[] = []
    syntaxTree(state).iterate({ enter: n => void names.push(n.name) })
    expect(names).toContain('ATXHeading1')
    expect(names).toContain('StrongEmphasis')
  })
  it('parses GFM tables and strikethrough', () => {
    const state = EditorState.create({ doc: '| a |\n| - |\n| b |\n\n~~x~~', extensions: createExtensions(noop) })
    const names: string[] = []
    syntaxTree(state).iterate({ enter: n => void names.push(n.name) })
    expect(names).toContain('Table')
    expect(names).toContain('Strikethrough')
  })
})

describe('readOnlyExtensions', () => {
  it('marks the state read-only and filters out every document change', () => {
    const state = EditorState.create({
      doc: 'hello',
      extensions: [createExtensions(noop), readOnlyExtensions()],
    })
    expect(state.readOnly).toBe(true)

    const tr = state.update({ changes: { from: 0, insert: 'X' } })
    expect(tr.docChanged).toBe(false)
    expect(tr.state.doc.toString()).toBe('hello')
  })
})
