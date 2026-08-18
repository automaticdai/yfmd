import { syntaxTree } from '@codemirror/language'
import { openSearchPanel } from '@codemirror/search'
import type { EditorState, Extension } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

import { findMathRanges } from './live-preview/math'

const TAG = /(^|[\s(])(#[\p{L}\p{N}_][\p{L}\p{N}_-]*)/gu

function inCodeOrHeading(state: EditorState, pos: number): boolean {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    const name = n.name
    if (name === 'FencedCode' || name === 'CodeBlock' || name === 'InlineCode' ||
        /^ATXHeading/.test(name) || /^SetextHeading/.test(name)) return true
  }
  const mathRanges = findMathRanges(state)
  if (mathRanges.some(m => pos >= m.from && pos <= m.to)) return true
  return false
}

export interface TagRange { from: number; to: number; text: string }

/** Inline `#tag` occurrences (skipping headings, code blocks/spans). */
export function findTags(state: EditorState): TagRange[] {
  const out: TagRange[] = []
  const text = state.doc.toString()
  TAG.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG.exec(text))) {
    const from = m.index + m[1].length
    const to = from + m[2].length
    if (inCodeOrHeading(state, from + 1)) continue
    out.push({ from, to, text: m[2] })
  }
  return out
}

function buildTags(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const tag of findTags(state)) {
    builder.add(tag.from, tag.to, Decoration.mark({ class: 'cm-tag' }))
  }
  return builder.finish()
}

const tagField = StateField.define<DecorationSet>({
  create: buildTags,
  update(deco, tr) {
    if (tr.docChanged) return buildTags(tr.state)
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})

function tagClickHandler(event: MouseEvent, view: EditorView): boolean {
  const el = (event.target as HTMLElement | null)?.closest?.('.cm-tag')
  if (!el) return false
  event.preventDefault()
  openSearchPanel(view)
  return true
}

export const inlineTagsExtension: Extension = [
  tagField,
  EditorView.domEventHandlers({ mousedown: tagClickHandler }),
]
