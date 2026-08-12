import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { buildTocMarkdown, insertTocSpec } from './toc'

describe('buildTocMarkdown', () => {
  it('generates a nested list with anchors', () => {
    expect(buildTocMarkdown([
      { level: 1, text: 'Intro', from: 0 },
      { level: 2, text: 'Deep Learning', from: 10 },
    ])).toBe('- [Intro](#intro)\n  - [Deep Learning](#deep-learning)')
  })
})

describe('insertTocSpec', () => {
  it('inserts a TOC for headings in the document', () => {
    const state = EditorState.create({
      doc: '# Intro\n\n## Details\n',
      selection: EditorSelection.cursor(0),
      extensions: [markdown({ base: markdownLanguage })],
    })
    const next = state.update(insertTocSpec(state)!).state
    expect(next.doc.toString()).toBe('- [Intro](#intro)\n  - [Details](#details)\n# Intro\n\n## Details\n')
  })

  it('returns null with no headings', () => {
    const state = EditorState.create({
      doc: 'plain text',
      selection: EditorSelection.cursor(0),
      extensions: [markdown({ base: markdownLanguage })],
    })
    expect(insertTocSpec(state)).toBeNull()
  })
})
