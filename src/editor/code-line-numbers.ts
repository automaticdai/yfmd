import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { RangeSetBuilder, StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'

class LineNumberWidget extends WidgetType {
  constructor(readonly n: number) { super() }
  eq(other: LineNumberWidget) { return other.n === this.n }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-code-lineno'
    span.textContent = String(this.n)
    return span
  }
  ignoreEvent() { return true }
}

function buildCodeLineNumbers(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'FencedCode') return
      const code = node.node.getChild('CodeText')
      if (!code || code.to <= code.from) return
      const first = state.doc.lineAt(code.from)
      const last = state.doc.lineAt(code.to - 1)
      let n = 1
      for (let ln = first.number; ln <= last.number; ln++) {
        const line = state.doc.line(ln)
        builder.add(line.from, line.from, Decoration.widget({ widget: new LineNumberWidget(n), side: 1 }))
        n++
      }
    },
  })
  return builder.finish()
}

/** Line-number gutters for fenced code blocks. */
export const codeLineNumbersField = StateField.define<DecorationSet>({
  create: buildCodeLineNumbers,
  update(deco, tr) {
    if (tr.docChanged) return buildCodeLineNumbers(tr.state)
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})
