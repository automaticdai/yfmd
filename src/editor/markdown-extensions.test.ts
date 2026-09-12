import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorSelection, EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SYNTAX_OPTIONS, syntaxOptions, type SyntaxOptions } from './live-preview/facets'
import { findExtensions, markdownExtensionsField } from './markdown-extensions'

function state(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

function inner(doc: string): string[] {
  return findExtensions(state(doc)).map(m => doc.slice(m.innerFrom, m.innerTo))
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
  it('does not read the caret in a footnote marker as a superscript', () => {
    const doc = 'claim[^a] with x^2^'
    expect(inner(doc)).toEqual(['2'])
  })
  it('does not read the caret in a footnote definition as a superscript', () => {
    expect(inner('[^a]: note with x^2^')).toEqual(['2'])
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

describe('markdownExtensionsField syntax toggles', () => {
  function decorated(doc: string, opts: Partial<SyntaxOptions>): [number, number][] {
    const s = EditorState.create({
      doc,
      extensions: [
        markdown({ base: markdownLanguage }),
        syntaxOptions.of({ ...DEFAULT_SYNTAX_OPTIONS, ...opts }),
        markdownExtensionsField,
      ],
    })
    const out: [number, number][] = []
    const it = s.field(markdownExtensionsField).decorations.iter()
    while (it.value) { out.push([it.from, it.to]); it.next() }
    return out
  }

  it('decorates highlight, superscript and subscript when every toggle is on', () => {
    expect(decorated('==hi== x^2^ H~2~O', {}).length).toBeGreaterThan(0)
    expect(decorated('==hi==', {})).not.toEqual([])
    expect(decorated('x^2^', {})).not.toEqual([])
    expect(decorated('H~2~O', {})).not.toEqual([])
  })

  it('leaves ==highlight== undecorated when the highlight toggle is off', () => {
    expect(decorated('a ==hi== b', { highlight: false })).toEqual([])
  })

  it('still decorates superscript when only the highlight toggle is off', () => {
    expect(decorated('x^2^', { highlight: false })).not.toEqual([])
  })

  it('leaves ^sup^ and ~sub~ undecorated when the scripts toggle is off', () => {
    expect(decorated('x^2^ H~2~O', { scripts: false })).toEqual([])
  })

  it('still decorates highlight and emoji when only the scripts toggle is off', () => {
    expect(decorated('==hi==', { scripts: false })).not.toEqual([])
    expect(decorated('a :fire:', { scripts: false })).not.toEqual([])
  })
})

describe('markdownExtensionsField reconfiguration', () => {
  function count(s: EditorState): number {
    let n = 0
    const it = s.field(markdownExtensionsField).decorations.iter()
    while (it.value) { n++; it.next() }
    return n
  }

  it('drops highlight decorations when the facet is reconfigured, with no document edit', () => {
    const compartment = new Compartment()
    const state = EditorState.create({
      doc: 'a ==hi== b',
      extensions: [
        markdown({ base: markdownLanguage }),
        compartment.of(syntaxOptions.of(DEFAULT_SYNTAX_OPTIONS)),
        markdownExtensionsField,
      ],
    })
    expect(count(state)).toBeGreaterThan(0)

    const next = state.update({
      effects: compartment.reconfigure(syntaxOptions.of({ ...DEFAULT_SYNTAX_OPTIONS, highlight: false })),
    }).state
    expect(count(next)).toBe(0)
  })
})
