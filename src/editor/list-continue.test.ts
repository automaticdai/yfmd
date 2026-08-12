import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { continueListSpec } from './list-continue'

function apply(doc: string, cursor: number): { text: string; head: number } | null {
  const state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor) })
  const spec = continueListSpec(state)
  if (!spec) return null
  const next = state.update(spec).state
  return { text: next.doc.toString(), head: next.selection.main.head }
}

describe('continueListSpec', () => {
  it('continues a bullet list at end of line', () => {
    const r = apply('- foo', 5)
    expect(r).not.toBeNull()
    expect(r!.text).toBe('- foo\n- ')
    expect(r!.head).toBe('- foo\n- '.length)
  })

  it('increments an ordered list marker', () => {
    expect(apply('1. foo', 6)!.text).toBe('1. foo\n2. ')
  })

  it('preserves indentation for nested lists', () => {
    expect(apply('  - foo', 7)!.text).toBe('  - foo\n  - ')
  })

  it('drops the marker on an empty item', () => {
    expect(apply('- ', 2)!.text).toBe('')
  })

  it('does nothing mid-line', () => {
    expect(apply('- foo', 2)).toBeNull()
  })

  it('does nothing on a non-list line', () => {
    expect(apply('hello', 5)).toBeNull()
  })
})
