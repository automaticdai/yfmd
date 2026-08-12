import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { autoPairSpec } from './auto-pair'

function apply(doc: string, from: number, to: number, text: string) {
  const state = EditorState.create({ doc, selection: EditorSelection.range(from, to) })
  const spec = autoPairSpec(state, from, to, text)
  if (!spec) return null
  const next = state.update(spec).state
  return { text: next.doc.toString(), from: next.selection.main.from, to: next.selection.main.to }
}

describe('autoPairSpec', () => {
  it('pairs a backtick and puts the cursor inside', () => {
    const r = apply('ab', 1, 1, '`')
    expect(r!.text).toBe('a``b')
    expect(r!.from).toBe(2)
    expect(r!.to).toBe(2)
  })

  it('pairs brackets, parens and braces', () => {
    expect(apply('ab', 1, 1, '[')!.text).toBe('a[]b')
    expect(apply('ab', 1, 1, '(')!.text).toBe('a()b')
    expect(apply('ab', 1, 1, '{')!.text).toBe('a{}b')
  })

  it('wraps a selection with the pair', () => {
    const r = apply('hello world', 0, 5, '[')
    expect(r!.text).toBe('[hello] world')
    expect(r!.from).toBe(1)
    expect(r!.to).toBe(6)
  })

  it('skips over an already-present closer', () => {
    const r = apply('[]', 1, 1, ']')
    expect(r!.text).toBe('[]')
    expect(r!.from).toBe(2)
  })

  it('skips over an already-present backtick', () => {
    const r = apply('``', 1, 1, '`')
    expect(r!.text).toBe('``')
    expect(r!.from).toBe(2)
  })

  it('does not pair unrelated or multi-character input', () => {
    expect(apply('ab', 1, 1, 'x')).toBeNull()
    expect(apply('ab', 1, 1, '**')).toBeNull()
  })

  it('falls through for a closer not before itself', () => {
    expect(apply('ab', 1, 1, ']')).toBeNull()
  })
})
