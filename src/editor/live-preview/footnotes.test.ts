import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SYNTAX_OPTIONS, syntaxOptions } from './facets'
import { scanFootnotes } from './footnote-scan'
import { footnotesField } from './footnotes'

const scan = (doc: string) => scanFootnotes(doc, [])

describe('scanFootnotes', () => {
  it('finds an inline reference and numbers it 1', () => {
    const { refs } = scan('A claim[^a].')
    expect(refs).toEqual([{ from: 7, to: 11, id: 'a', num: 1 }])
  })

  it('numbers references by order of first appearance', () => {
    expect(scan('x[^b] y[^a] z[^b]').refs.map(r => [r.id, r.num])).toEqual([
      ['b', 1], ['a', 2], ['b', 1],
    ])
  })

  it('gives a definition the number of its matching reference', () => {
    const { defs } = scan('x[^b] y[^a]\n\n[^a]: second\n[^b]: first\n')
    expect(defs.map(d => [d.id, d.num])).toEqual([['a', 2], ['b', 1]])
  })

  it('numbers a definition with no reference after the referenced ones', () => {
    expect(scan('x[^a]\n\n[^a]: one\n[^z]: orphan\n').defs.map(d => d.num)).toEqual([1, 2])
  })

  it('spans the definition from line start to line end, with the marker measured separately', () => {
    const doc = '[^a]: text here'
    const [def] = scan(doc).defs
    expect(doc.slice(def.from, def.markerTo)).toBe('[^a]: ')
    expect(doc.slice(def.from, def.to)).toBe(doc)
  })

  it('does not treat a definition line as a reference', () => {
    expect(scan('[^a]: only a definition').refs).toEqual([])
  })

  it('ignores footnote syntax inside excluded ranges', () => {
    const doc = 'code `[^a]` here'
    expect(scanFootnotes(doc, [[5, 11]]).refs).toEqual([])
  })

  it('rejects ids that are not word characters', () => {
    expect(scan('a[^has space] b[^]').refs).toEqual([])
  })

  it('requires a definition marker to start its line', () => {
    expect(scan('text [^a]: not a definition').defs).toEqual([])
  })
})

describe('footnotesField', () => {
  const mk = (doc: string, cursor = 0, refs = true) => EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [
      markdown({ base: markdownLanguage }),
      syntaxOptions.of({ ...DEFAULT_SYNTAX_OPTIONS, references: refs }),
      footnotesField,
    ],
  })
  function ranges(s: EditorState): [number, number][] {
    const out: [number, number][] = []
    const it = s.field(footnotesField).decorations.iter()
    while (it.value) { out.push([it.from, it.to]); it.next() }
    return out
  }
  // node test env has no DOM, so assert the number the widget carries rather than its markup
  function numberAt(s: EditorState, from: number): number | null {
    const it = s.field(footnotesField).decorations.iter()
    while (it.value) {
      if (it.from === from && it.value.spec.widget) return (it.value.spec.widget as { num: number }).num
      it.next()
    }
    return null
  }

  it('replaces an inline [^a] marker when the cursor is elsewhere', () => {
    expect(ranges(mk('A claim[^a].', 0))).toEqual(expect.arrayContaining([[7, 11]]))
  })

  it('reveals the [^a] source when the cursor touches it', () => {
    expect(ranges(mk('A claim[^a].', 9))).not.toEqual(expect.arrayContaining([[7, 11]]))
  })

  it('shows the footnote number in place of the marker', () => {
    expect(numberAt(mk('x[^b] y[^a]', 0), 7)).toBe(2)
  })

  it('replaces the marker of a definition line', () => {
    expect(ranges(mk('x[^a]\n\n[^a]: note', 0))).toEqual(expect.arrayContaining([[7, 13]]))
  })

  it('reveals a definition marker when the cursor is on that line', () => {
    expect(ranges(mk('x[^a]\n\n[^a]: note', 14))).not.toEqual(expect.arrayContaining([[7, 13]]))
  })

  it('marks the definition line itself, so the block reads as a reference list', () => {
    // a line decoration sits at the line start as a zero-length range
    expect(ranges(mk('x[^a]\n\n[^a]: note', 0))).toEqual(expect.arrayContaining([[7, 7]]))
  })

  it('keeps the definition line marked while the cursor is editing that line', () => {
    expect(ranges(mk('x[^a]\n\n[^a]: note', 14))).toEqual(expect.arrayContaining([[7, 7]]))
  })

  it('decorates nothing when the references toggle is off', () => {
    expect(ranges(mk('A claim[^a].\n\n[^a]: note', 0, false))).toEqual([])
  })

  it('ignores footnote markers inside a fenced code block', () => {
    expect(ranges(mk('```\n[^a]\n```', 0))).toEqual([])
  })
})
