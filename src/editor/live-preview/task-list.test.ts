import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { toggleTaskAt } from './task-list'

function mk(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown({ base: markdownLanguage })] })
}

describe('toggleTaskAt', () => {
  it('checks an unchecked task', () => {
    const state = mk('- [ ] milk')       // TaskMarker at 2..5
    const spec = toggleTaskAt(state, 2)
    expect(spec).not.toBeNull()
    const next = state.update(spec!).state
    expect(next.doc.toString()).toBe('- [x] milk')
  })
  it('unchecks a checked task', () => {
    const state = mk('- [x] milk')
    const next = state.update(toggleTaskAt(state, 2)!).state
    expect(next.doc.toString()).toBe('- [ ] milk')
  })
  it('returns null outside a task marker', () => {
    expect(toggleTaskAt(mk('- [ ] milk'), 8)).toBeNull()
  })
})
