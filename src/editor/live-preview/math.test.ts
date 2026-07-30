import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { findMathRanges } from './math'

function mk(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

describe('findMathRanges', () => {
  it('finds inline math', () => {
    const r = findMathRanges(mk('a $x+y$ b'))
    expect(r).toEqual([{ from: 2, to: 7, tex: 'x+y', block: false }])
  })
  it('finds block math on its own lines', () => {
    const doc = 'before\n$$\nE=mc^2\n$$\nafter'
    const r = findMathRanges(mk(doc))
    expect(r).toHaveLength(1)
    expect(r[0].block).toBe(true)
    expect(r[0].tex).toBe('E=mc^2')
    expect(r[0].from).toBe(7)
    expect(r[0].to).toBe(19)
  })
  it('treats $$..$$ inside a line as display math but not a block', () => {
    const r = findMathRanges(mk('x $$a$$ y'))
    expect(r).toHaveLength(1)
    expect(r[0].block).toBe(false)
  })
  it('rejects currency-like dollars', () => {
    expect(findMathRanges(mk('costs $5 and $10 total'))).toEqual([])
  })
  it('rejects spaced delimiters', () => {
    expect(findMathRanges(mk('a $ x $ b'))).toEqual([])
  })
  it('ignores math inside code', () => {
    expect(findMathRanges(mk('`$x$`'))).toEqual([])
    expect(findMathRanges(mk('```\n$x$\n```'))).toEqual([])
  })
  it('ignores escaped dollars', () => {
    expect(findMathRanges(mk('\\$5 and \\$10$'))).toEqual([])
  })
})
