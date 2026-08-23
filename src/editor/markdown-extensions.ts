import type { EditorState } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { getExtensions } from './live-preview/analysis'
import { EMOJI, type ExtMatch } from './live-preview/extensions'

export { EMOJI, findExtensions, type ExtKind, type ExtMatch } from './live-preview/extensions'

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

function buildExtensionDecorations(matches: ExtMatch[], state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const hide = Decoration.replace({})
  for (const m of matches) {
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
  create: state => buildExtensionDecorations(getExtensions(state), state),
  update(deco, tr) {
    if (tr.docChanged) return buildExtensionDecorations(getExtensions(tr.state), tr.state)
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})
