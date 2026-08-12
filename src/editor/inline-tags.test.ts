import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { findTags } from './inline-tags'

function state(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

describe('findTags', () => {
  it('finds inline #tags including CJK and hyphens', () => {
    expect(findTags(state('hello #world and #深度 and #foo-bar')).map(t => t.text))
      .toEqual(['#world', '#深度', '#foo-bar'])
  })

  it('does not treat a heading as a tag', () => {
    expect(findTags(state('# Heading\n\ntext')).map(t => t.text)).toEqual([])
  })

  it('ignores tags inside code blocks', () => {
    expect(findTags(state('```\n#notatag\n```\n\n#real')).map(t => t.text)).toEqual(['#real'])
  })
})
