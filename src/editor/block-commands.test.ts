import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  insertBlockChanges, setHeadingChanges, toggleListChanges, toggleQuoteChanges,
} from './block-commands'

function sel(doc: string, pos: number): EditorState {
  return EditorState.create({ doc, selection: EditorSelection.cursor(pos) })
}
function range(doc: string, from: number, to: number): EditorState {
  return EditorState.create({ doc, selection: EditorSelection.range(from, to) })
}

describe('setHeadingChanges', () => {
  it('turns a paragraph into a heading', () => {
    const state = sel('hello', 0)
    const next = state.update(setHeadingChanges(state, 2)).state
    expect(next.doc.toString()).toBe('## hello')
  })
  it('toggles the same level back to a paragraph', () => {
    const state = sel('## hello', 0)
    const next = state.update(setHeadingChanges(state, 2)).state
    expect(next.doc.toString()).toBe('hello')
  })
  it('changes an existing heading to a different level', () => {
    const state = sel('## hello', 0)
    const next = state.update(setHeadingChanges(state, 1)).state
    expect(next.doc.toString()).toBe('# hello')
  })
  it('level 0 always strips to a paragraph', () => {
    const state = sel('### hello', 0)
    const next = state.update(setHeadingChanges(state, 0)).state
    expect(next.doc.toString()).toBe('hello')
  })
  it('only touches the cursor line in a multi-line doc', () => {
    const state = sel('a\nb\nc', 2)
    const next = state.update(setHeadingChanges(state, 1)).state
    expect(next.doc.toString()).toBe('a\n# b\nc')
  })
})

describe('toggleQuoteChanges', () => {
  it('adds a quote marker', () => {
    const state = sel('hello', 0)
    const next = state.update(toggleQuoteChanges(state)).state
    expect(next.doc.toString()).toBe('> hello')
  })
  it('removes an existing quote marker', () => {
    const state = sel('> hello', 0)
    const next = state.update(toggleQuoteChanges(state)).state
    expect(next.doc.toString()).toBe('hello')
  })
  it('toggles every non-blank line the selection spans', () => {
    const state = range('a\nb', 0, 3)
    const next = state.update(toggleQuoteChanges(state)).state
    expect(next.doc.toString()).toBe('> a\n> b')
  })
})

describe('toggleListChanges', () => {
  it('adds unordered markers', () => {
    const state = sel('milk\neggs', 0)
    const next = state.update(toggleListChanges(state, 'unordered')).state
    expect(next.doc.toString()).toBe('- milk\neggs')
  })
  it('adds sequential ordered markers across a selection', () => {
    const state = range('milk\neggs', 0, 9)
    const next = state.update(toggleListChanges(state, 'ordered')).state
    expect(next.doc.toString()).toBe('1. milk\n2. eggs')
  })
  it('removes existing markers of the same kind', () => {
    const state = range('- milk\n- eggs', 0, 13)
    const next = state.update(toggleListChanges(state, 'unordered')).state
    expect(next.doc.toString()).toBe('milk\neggs')
  })
})

describe('insertBlockChanges', () => {
  it('pads with blank lines when inserting mid-paragraph', () => {
    const state = sel('para', 4)
    const next = state.update(insertBlockChanges(state, '---', 3)).state
    expect(next.doc.toString()).toBe('para\n\n---\n\n')
  })
  it('skips the leading pad when the cursor is already on a blank line', () => {
    const state = sel('para\n\nend', 5)
    const next = state.update(insertBlockChanges(state, '---', 3)).state
    expect(next.doc.toString()).toBe('para\n\n---\n\nend')
  })
  it('selects the requested range within the inserted snippet', () => {
    const state = sel('', 0)
    const next = state.update(insertBlockChanges(state, 'ab', 0, 2)).state
    expect(next.selection.main.from).toBe(0)
    expect(next.selection.main.to).toBe(2)
  })
})
