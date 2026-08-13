import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'

export type ExtKind = 'mark' | 'sup' | 'sub' | 'emoji'
export interface ExtMatch { from: number; to: number; innerFrom: number; innerTo: number; kind: ExtKind }

export const EMOJI: Record<string, string> = {
  smile: '😄', grin: '😁', joy: '😂', wink: '😉', heart: '❤️', smiley: '😃',
  thumbsup: '👍', thumbsdown: '👎', clap: '👏', fire: '🔥', star: '⭐', ok_hand: '👌',
  warning: '⚠️', check: '✅', x: '❌', tada: '🎉', rocket: '🚀', pray: '🙏', eyes: '👀',
}

function codeRanges(state: EditorState): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  syntaxTree(state).iterate({
    enter(node): boolean | void {
      if (node.name === 'FencedCode' || node.name === 'CodeBlock' || node.name === 'InlineCode') {
        ranges.push([node.from, node.to])
        return false
      }
    },
  })
  return ranges
}

/** Inline extension syntax (`==`, `^`, `~`, `:emoji:`) outside code blocks. */
export function findExtensions(state: EditorState): ExtMatch[] {
  const text = state.doc.toString()
  const code = codeRanges(state)
  const inCode = (pos: number) => code.some(([f, t]) => pos >= f && pos < t)
  const out: ExtMatch[] = []

  for (const m of text.matchAll(/==([^=\n]+)==/g)) {
    if (inCode(m.index!)) continue
    out.push({ from: m.index!, to: m.index! + m[0].length, innerFrom: m.index! + 2, innerTo: m.index! + 2 + m[1].length, kind: 'mark' })
  }
  for (const m of text.matchAll(/\^([^\s^][^\^\n]*)\^(?!\^)/g)) {
    if (inCode(m.index!)) continue
    out.push({ from: m.index!, to: m.index! + m[0].length, innerFrom: m.index! + 1, innerTo: m.index! + 1 + m[1].length, kind: 'sup' })
  }
  for (const m of text.matchAll(/~([^\s~][^~\n]*)~(?!~)/g)) {
    if (inCode(m.index!)) continue
    out.push({ from: m.index!, to: m.index! + m[0].length, innerFrom: m.index! + 1, innerTo: m.index! + 1 + m[1].length, kind: 'sub' })
  }
  for (const m of text.matchAll(/:([a-zA-Z0-9_+-]+):/g)) {
    if (!EMOJI[m[1]] || inCode(m.index!)) continue
    out.push({ from: m.index!, to: m.index! + m[0].length, innerFrom: m.index! + 1, innerTo: m.index! + 1 + m[1].length, kind: 'emoji' })
  }
  return out
}

class EmojiWidget extends WidgetType {
  constructor(readonly char: string) { super() }
  eq(o: EmojiWidget) { return o.char === this.char }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-emoji'
    span.textContent = this.char
    return span
  }
  ignoreEvent() { return true }
}

function buildExtensionDecorations(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const hide = Decoration.replace({})
  for (const m of findExtensions(state)) {
    if (m.kind === 'emoji') {
      const char = EMOJI[state.sliceDoc(m.innerFrom, m.innerTo)]
      if (char) builder.add(m.from, m.to, Decoration.replace({ widget: new EmojiWidget(char) }))
      continue
    }
    builder.add(m.from, m.innerFrom, hide)
    builder.add(m.innerFrom, m.innerTo, Decoration.mark({ class: m.kind === 'mark' ? 'cm-mark' : m.kind === 'sup' ? 'cm-sup' : 'cm-sub' }))
    builder.add(m.innerTo, m.to, hide)
  }
  return builder.finish()
}

export const markdownExtensionsField = StateField.define<DecorationSet>({
  create: buildExtensionDecorations,
  update(deco, tr) {
    if (tr.docChanged) return buildExtensionDecorations(tr.state)
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})
