import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { buildWidgetDecorations } from './widget-field'

function mk(doc: string, cursor = 0): EditorState {
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [markdown({ base: markdownLanguage })],
  })
}
function ranges(set: DecorationSet): [number, number][] {
  const out: [number, number][] = []
  const it = set.iter()
  while (it.value) { out.push([it.from, it.to]); it.next() }
  return out
}

describe('image widgets', () => {
  it('replaces an image when cursor is outside', () => {
    const doc = 'see ![alt text](pic.png) here'
    const set = buildWidgetDecorations(mk(doc, 0))
    expect(ranges(set)).toEqual([[4, 24]])
  })
  it('reveals source when cursor touches the image', () => {
    const set = buildWidgetDecorations(mk('see ![alt](pic.png) here', 8))
    expect(ranges(set)).toEqual([])
  })
})

describe('horizontal rule widgets', () => {
  it('replaces --- lines when cursor is elsewhere', () => {
    const set = buildWidgetDecorations(mk('a\n\n---\n\nb', 0))
    expect(ranges(set)).toEqual([[3, 6]])
  })
  it('reveals when cursor is on the rule line', () => {
    const set = buildWidgetDecorations(mk('a\n\n---\n\nb', 4))
    expect(ranges(set)).toEqual([])
  })
})
