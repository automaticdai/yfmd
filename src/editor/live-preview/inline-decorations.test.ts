import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { buildInlineDecorations } from './inline-decorations'
import { selectionTouches } from './cursor-context'
import { livePreviewExtensions } from './index'

function mkState(doc: string, cursor = 0): EditorState {
  return EditorState.create({
    doc,
    selection: EditorSelection.cursor(cursor),
    extensions: [markdown({ base: markdownLanguage }), livePreviewExtensions({ openExternal() {} })],
  })
}
function hiddenRanges(set: DecorationSet): [number, number][] {
  const out: [number, number][] = []
  const it = set.iter()
  while (it.value) { out.push([it.from, it.to]); it.next() }
  return out
}

function lineClasses(set: DecorationSet): string[] {
  const out: string[] = []
  const it = set.iter()
  while (it.value) { out.push((it.value.spec as { class: string }).class); it.next() }
  return out
}

const FRONTMATTER = '---\ntitle: 深度神经网络\ntags:\n  - dnn\n---\n\n# Body\n'

describe('frontmatter', () => {
  it('boxes every frontmatter line and marks the edges', () => {
    const classes = lineClasses(buildInlineDecorations(mkState(FRONTMATTER, FRONTMATTER.length - 1)).lines)
    expect(classes.filter(c => c.includes('frontmatter'))).toEqual([
      'cm-frontmatter-line cm-frontmatter-first',
      'cm-frontmatter-line',
      'cm-frontmatter-line',
      'cm-frontmatter-line',
      'cm-frontmatter-line cm-frontmatter-last',
    ])
  })
  it('keeps markdown structure out of the block', () => {
    // 'title: **x**' + '---' otherwise parses as a Setext heading whose underline
    // gets dimmed, with the '**' emphasis marks hidden on top
    const doc = '---\ntitle: **x**\n---\n\n# Body\n'
    const { hides } = buildInlineDecorations(mkState(doc, doc.length - 1))
    expect(hiddenRanges(hides)).toEqual([])
  })
  it('still decorates the document after the block', () => {
    const classes = lineClasses(buildInlineDecorations(mkState(FRONTMATTER, 0)).lines)
    expect(classes).toContain('cm-heading-line cm-heading-line-1')
  })
  it('leaves an unterminated block as ordinary markdown', () => {
    const classes = lineClasses(buildInlineDecorations(mkState('---\ntitle: x\n\n# Body\n', 0)).lines)
    expect(classes).not.toContain('cm-frontmatter-line')
  })
})

describe('selectionTouches', () => {
  it('touches at boundaries', () => {
    const s = mkState('abcdef', 3)
    expect(selectionTouches(s, 0, 3)).toBe(true)
    expect(selectionTouches(s, 3, 6)).toBe(true)
    expect(selectionTouches(s, 4, 6)).toBe(false)
  })
})

describe('inline mark hiding', () => {
  it('hides ** markers when cursor is outside', () => {
    // doc: "x **bold** y" — bold node spans 2..10, marks 2..4 and 8..10
    const { hides } = buildInlineDecorations(mkState('x **bold** y', 0))
    expect(hiddenRanges(hides)).toEqual(expect.arrayContaining([[2, 4], [8, 10]]))
  })
  it('reveals ** markers when cursor is inside', () => {
    const { hides } = buildInlineDecorations(mkState('x **bold** y', 5))
    expect(hiddenRanges(hides)).toEqual([])
  })
  it('hides heading mark unless cursor on the line', () => {
    const outside = buildInlineDecorations(mkState('# Title\ntext', 10))
    expect(hiddenRanges(outside.hides)).toEqual(expect.arrayContaining([[0, 2]]))
    const inside = buildInlineDecorations(mkState('# Title\ntext', 3))
    expect(hiddenRanges(inside.hides)).toEqual([])
  })
  it('hides the leading mark of an indented ATX heading', () => {
    // '  # Title' — HeaderMark is at col 2, not the line start; the '# ' must
    // still hide when the cursor is elsewhere (regression: old guard compared
    // against the raw line start and never hid indented/nested headings).
    const doc = '  # Title\n\ntext'
    const outside = hiddenRanges(buildInlineDecorations(mkState(doc, 12)).hides)
    expect(outside.some(([f, t]) => doc.slice(f, t) === '# ')).toBe(true)
    const inside = hiddenRanges(buildInlineDecorations(mkState(doc, 4)).hides)
    expect(inside.some(([f, t]) => doc.slice(f, t) === '# ')).toBe(false)
  })
  it('hides link syntax when outside, keeps text', () => {
    // "[ab](http://x)" — marks [0,1],[3,4],[4,5],[13,14], URL [5,13]
    const { hides } = buildInlineDecorations(mkState('[ab](http://x) end', 17))
    const ranges = hiddenRanges(hides)
    expect(ranges).toEqual(expect.arrayContaining([[0, 1], [3, 4], [4, 5], [5, 13], [13, 14]]))
  })
  it('hides inline code backticks but dims fenced code marks', () => {
    const state = mkState('`a`\n\n```js\nlet x\n```', 20)
    const { hides } = buildInlineDecorations(state)
    expect(hiddenRanges(hides)).toEqual(expect.arrayContaining([[0, 1], [2, 3]]))
  })
  it('adds heading and quote line classes', () => {
    const { lines } = buildInlineDecorations(mkState('# H\n\n> q', 0))
    const it = lines.iter()
    const classes: string[] = []
    while (it.value) { classes.push((it.value.spec as { class: string }).class); it.next() }
    expect(classes.join(' ')).toContain('cm-heading-line-1')
    expect(classes.join(' ')).toContain('cm-quote-line')
  })
})
