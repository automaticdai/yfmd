import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
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
})
