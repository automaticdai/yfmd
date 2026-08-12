import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { findExtensions } from './markdown-extensions'

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
