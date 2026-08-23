import type { EditorState, Range } from '@codemirror/state'
import { StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { selectionTouches } from './live-preview/cursor-context'
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

/** A decoration that reveals its source when the cursor touches its guard range. */
interface Revealable { deco: Range<Decoration>; guardFrom: number; guardTo: number }

interface ExtensionStructure {
  staticDeco: Range<Decoration>[]
  revealable: Revealable[]
}

function buildExtensionStructure(matches: ExtMatch[], state: EditorState): ExtensionStructure {
  const staticDeco: Range<Decoration>[] = []
  const revealable: Revealable[] = []
  const hide = Decoration.replace({})
  for (const m of matches) {
    if (m.kind === 'emoji') {
      const char = EMOJI[state.sliceDoc(m.innerFrom, m.innerTo)]
      if (char) {
        revealable.push({
          deco: Decoration.replace({ widget: new EmojiWidget(char) }).range(m.from, m.to),
          guardFrom: m.from,
          guardTo: m.to,
        })
      }
      continue
    }
    const cls = m.kind === 'mark' ? 'cm-mark' : m.kind === 'sup' ? 'cm-sup' : 'cm-sub'
    revealable.push({ deco: hide.range(m.from, m.innerFrom), guardFrom: m.from, guardTo: m.to })
    staticDeco.push(Decoration.mark({ class: cls }).range(m.innerFrom, m.innerTo))
    revealable.push({ deco: hide.range(m.innerTo, m.to), guardFrom: m.from, guardTo: m.to })
  }
  return { staticDeco, revealable }
}

function applyExtensionSelection(structure: ExtensionStructure, state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [...structure.staticDeco]
  for (const r of structure.revealable) {
    if (!selectionTouches(state, r.guardFrom, r.guardTo)) ranges.push(r.deco)
  }
  return Decoration.set(ranges, true)
}

interface FieldValue { structure: ExtensionStructure; decorations: DecorationSet }

export const markdownExtensionsField = StateField.define<FieldValue>({
  create: state => {
    const structure = buildExtensionStructure(getExtensions(state), state)
    return { structure, decorations: applyExtensionSelection(structure, state) }
  },
  update(value, tr) {
    if (tr.docChanged) {
      const structure = buildExtensionStructure(getExtensions(tr.state), tr.state)
      return { structure, decorations: applyExtensionSelection(structure, tr.state) }
    }
    if (!tr.startState.selection.eq(tr.state.selection)) {
      return { structure: value.structure, decorations: applyExtensionSelection(value.structure, tr.state) }
    }
    return value
  },
  provide: f => EditorView.decorations.from(f, value => value.decorations),
})
