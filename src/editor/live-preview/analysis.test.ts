import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { updateExtensions } from './analysis'
import { findExtensions } from './extensions'
import { findMathRanges } from './math'

function state(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

/** Apply an edit and assert the incremental result exactly equals the full rescan. */
function assertAgrees(doc: string, from: number, to: number, insert: string) {
  const oldState = state(doc)
  const tr = oldState.update({ changes: { from, to, insert } })
  const prev = findExtensions(oldState)
  const incremental = updateExtensions(prev, tr, findMathRanges(tr.state))
  const full = findExtensions(tr.state)
  expect(incremental).toEqual(full)
  return full
}

describe('updateExtensions (incremental) matches the full scan', () => {
  it('remaps matches after a plain insertion before them', () => {
    const r = assertAgrees('x ==hi== y', 0, 0, 'abc ')
    expect(r.map(m => m.kind)).toEqual(['mark'])
    expect(r[0].from).toBe(6)
  })

  it('creates a new match from a plain insertion', () => {
    const r = assertAgrees('hello world', 0, 0, '==x== ')
    expect(r.map(m => m.kind)).toEqual(['mark'])
  })

  it('drops a match removed by a deletion', () => {
    const r = assertAgrees('a ==gone== b', 2, 10, '')
    expect(r).toEqual([])
  })

  it('handles a multi-line insertion that splits a line', () => {
    const r = assertAgrees('a ==hi== b', 0, 0, 'line1\nline2\n')
    expect(r.map(m => m.kind)).toEqual(['mark'])
  })

  it('re-scans only the changed region and keeps distant matches', () => {
    const doc = '==first==\n\nsome prose\n\n==last=='
    const pos = doc.indexOf('prose')
    const r = assertAgrees(doc, pos, pos, '==mid==')
    expect(r.map(m => m.kind)).toEqual(['mark', 'mark', 'mark'])
  })

  it('falls back to a full scan when a backtick (code fence) is inserted', () => {
    assertAgrees('a ==x==\n\nb ==y==', 0, 0, '```\n')
  })

  it('falls back to a full scan when a dollar (math) is inserted', () => {
    assertAgrees('a ==x==', 0, 0, '$')
  })

  it('ignores matches that land inside a newly-opened code block', () => {
    // The fence insertion must suppress the ==x== that is now inside the block.
    const r = assertAgrees('==x==', 0, 0, '```\n')
    expect(r).toEqual([])
  })

  it('re-detects a match that moves out of code', () => {
    const r = assertAgrees('```\n==x==\n```', 0, 0, '```\n')
    expect(r.map(m => m.kind)).toEqual(['mark'])
  })
})
