import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { findExtensions, markdownExtensionsField } from './markdown-extensions'

function state(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

function kinds(doc: string): string[] {
  return findExtensions(state(doc)).map(m => m.kind)
}

describe('findExtensions', () => {
  it('detects highlight ==text==', () => {
    expect(kinds('a ==hi== b')).toEqual(['mark'])
  })
  it('returns matches sorted by document position regardless of kind', () => {
    const matches = findExtensions(state('x^2^ and ==hi=='))
    const positions = matches.map(m => m.from)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })
  it('detects superscript ^text^ and subscript ~text~', () => {
    expect(kinds('x^2^ and H~2~O')).toEqual(['sup', 'sub'])
  })
  it('does not treat ~~strike~~ as subscript', () => {
    expect(kinds('~~del~~')).toEqual([])
  })
  it('detects emoji shortcodes', () => {
    expect(kinds('nice :fire:')).toEqual(['emoji'])
  })
  it('ignores extensions inside code blocks', () => {
    expect(kinds('```\n==x==\n```\n\n==y==')).toEqual(['mark'])
  })
})

describe('markdownExtensionsField', () => {
  it('builds decorations for highlight without throwing', () => {
    const s = EditorState.create({
      doc: 'a ==hi== b',
      extensions: [markdown({ base: markdownLanguage }), markdownExtensionsField],
    })
    expect(() => s.field(markdownExtensionsField)).not.toThrow()
  })
  it('builds decorations for superscript/subscript without throwing', () => {
    const s = EditorState.create({
      doc: 'x^2^ and H~2~O',
      extensions: [markdown({ base: markdownLanguage }), markdownExtensionsField],
    })
    expect(() => s.field(markdownExtensionsField)).not.toThrow()
  })
  it('builds decorations when a later kind appears before an earlier kind in the doc', () => {
    // sup occurs before mark in the text, but findExtensions groups matches by
    // kind (mark loop runs first), so the raw match order is out of position order.
    const s = EditorState.create({
      doc: 'x^2^ and ==hi==',
      extensions: [markdown({ base: markdownLanguage }), markdownExtensionsField],
    })
    expect(() => s.field(markdownExtensionsField)).not.toThrow()
  })
})

describe('markdownExtensionsField selection reveal', () => {
  function ranges(set: DecorationSet): [number, number][] {
    const out: [number, number][] = []
    const it = set.iter()
    while (it.value) { out.push([it.from, it.to]); it.next() }
    return out
  }
  function mk(doc: string, cursor: number): EditorState {
    return EditorState.create({
      doc,
      selection: EditorSelection.cursor(cursor),
      extensions: [markdown({ base: markdownLanguage }), markdownExtensionsField],
    })
  }

  it('hides == markers when the cursor is outside and reveals them inside', () => {
    // "a ==hi== b": == at [2,4] and [6,8], text "hi" at [4,6]
    const outside = ranges(mk('a ==hi== b', 0).field(markdownExtensionsField).decorations)
    expect(outside).toEqual(expect.arrayContaining([[2, 4], [6, 8]]))
    expect(outside).toEqual(expect.arrayContaining([[4, 6]]))

    const inside = ranges(mk('a ==hi== b', 5).field(markdownExtensionsField).decorations)
    expect(inside).not.toEqual(expect.arrayContaining([[2, 4], [6, 8]]))
    expect(inside).toEqual(expect.arrayContaining([[4, 6]]))
  })

  it('reveals emoji shortcode when the cursor touches it', () => {
    const outside = ranges(mk('nice :fire:', 0).field(markdownExtensionsField).decorations)
    expect(outside.some(([f, t]) => f === 5 && t === 11)).toBe(true)

    const inside = ranges(mk('nice :fire:', 8).field(markdownExtensionsField).decorations)
    expect(inside.some(([f, t]) => f === 5 && t === 11)).toBe(false)
  })
})
