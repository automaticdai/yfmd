import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { wrapToggleChanges } from './commands'

function sel(doc: string, from: number, to: number): EditorState {
  return EditorState.create({ doc, selection: EditorSelection.range(from, to) })
}

describe('wrapToggleChanges', () => {
  it('wraps a selection', () => {
    const state = sel('hello world', 0, 5)
    const tr = state.update(wrapToggleChanges(state, '**'))
    expect(tr.state.doc.toString()).toBe('**hello** world')
    expect(tr.state.selection.main.from).toBe(2)
    expect(tr.state.selection.main.to).toBe(7)
  })
  it('unwraps when markers surround the selection', () => {
    const state = sel('**hello** world', 2, 7)
    const tr = state.update(wrapToggleChanges(state, '**'))
    expect(tr.state.doc.toString()).toBe('hello world')
  })
  it('unwraps when markers are inside the selection', () => {
    const state = sel('**hello** world', 0, 9)
    const tr = state.update(wrapToggleChanges(state, '**'))
    expect(tr.state.doc.toString()).toBe('hello world')
  })
  it('wraps an empty selection and puts the cursor inside', () => {
    const state = sel('ab', 1, 1)
    const tr = state.update(wrapToggleChanges(state, '*'))
    expect(tr.state.doc.toString()).toBe('a**b')
    expect(tr.state.selection.main.head).toBe(2)
  })
})
