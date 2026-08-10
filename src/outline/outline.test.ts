import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { extractOutline } from './outline'

function mk(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

describe('extractOutline', () => {
  it('extracts ATX headings with levels and positions', () => {
    const doc = '# One\ntext\n## Two\n### Three'
    expect(extractOutline(mk(doc))).toEqual([
      { level: 1, text: 'One', from: 0 },
      { level: 2, text: 'Two', from: 11 },
      { level: 3, text: 'Three', from: 18 },
    ])
  })
  it('ignores frontmatter, which otherwise parses as a Setext heading', () => {
    const doc = '---\ntitle: x\ntags:\n---\n\n# Real\n'
    expect(extractOutline(mk(doc))).toEqual([{ level: 1, text: 'Real', from: 24 }])
  })
  it('strips inline markup from heading text', () => {
    expect(extractOutline(mk('# A **bold** `code` title'))[0].text).toBe('A bold code title')
  })
  it('extracts setext headings', () => {
    const items = extractOutline(mk('Title\n=====\n\nSub\n---'))
    expect(items).toEqual([
      { level: 1, text: 'Title', from: 0 },
      { level: 2, text: 'Sub', from: 13 },
    ])
  })
  it('ignores heading-like text in code blocks', () => {
    expect(extractOutline(mk('```\n# not a heading\n```'))).toEqual([])
  })
})
