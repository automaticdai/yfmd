import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { syntaxTree } from '@codemirror/language'
import { createExtensions } from './setup'

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
