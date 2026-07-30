import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range, TransactionSpec } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view'
import { selectionTouches } from './cursor-context'

/** Find the TaskMarker at/around pos and produce the toggle change, or null. */
export function toggleTaskAt(state: EditorState, pos: number): TransactionSpec | null {
  let node = syntaxTree(state).resolveInner(pos, 1)
  if (node.name !== 'TaskMarker') node = syntaxTree(state).resolveInner(pos, -1)
  if (node.name !== 'TaskMarker') return null
  const text = state.sliceDoc(node.from, node.to)
  const checked = /x/i.test(text)
  return {
    changes: { from: node.from, to: node.to, insert: checked ? '[ ]' : '[x]' },
    userEvent: 'input',
  }
}

class CheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) { super() }
  eq(other: CheckboxWidget) { return other.checked === this.checked }
  toDOM(view: EditorView) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-task-checkbox'
    input.addEventListener('mousedown', e => {
      e.preventDefault()
      const pos = view.posAtDOM(input)
      const spec = toggleTaskAt(view.state, pos)
      if (spec) view.dispatch(spec)
    })
    return input
  }
  ignoreEvent() { return true }
}

function buildTaskDecorations(state: EditorState): DecorationSet {
  const decos: Range<Decoration>[] = []
  const doc = state.doc
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'TaskMarker') return
      const checked = /x/i.test(state.sliceDoc(node.from, node.to))
      if (checked) {
        decos.push(Decoration.line({ class: 'cm-task-done' }).range(doc.lineAt(node.from).from))
      }
      if (!selectionTouches(state, node.from, node.to)) {
        const space = doc.sliceString(node.to, node.to + 1) === ' ' ? 1 : 0
        decos.push(Decoration.replace({ widget: new CheckboxWidget(checked) }).range(node.from, node.to + space))
      }
    },
  })
  return Decoration.set(decos, true)
}

export const taskListExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = buildTaskDecorations(view.state) }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet) this.decorations = buildTaskDecorations(u.state)
    }
  },
  { decorations: v => v.decorations },
)
