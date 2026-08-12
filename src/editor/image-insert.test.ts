import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { insertImageSpec } from './image-insert'

function apply(doc: string, from: number, to: number, alt: string, src: string): string {
  const state = EditorState.create({ doc, selection: EditorSelection.range(from, to) })
  const next = state.update(insertImageSpec(state, alt, src)).state
  return next.doc.toString()
}

describe('insertImageSpec', () => {
  it('inserts an image reference at the cursor', () => {
    expect(apply('ab', 1, 1, 'x', 'img.png')).toBe('a![x](img.png)b')
  })

  it('replaces a selection', () => {
    expect(apply('hello', 0, 5, 'pic', 'a.png')).toBe('![pic](a.png)')
  })
})
