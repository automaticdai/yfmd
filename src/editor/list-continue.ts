import { type EditorState, type TransactionSpec } from '@codemirror/state'
import type { Command } from '@codemirror/view'

// indent + marker (bullet or `N.`/`N)`) + trailing whitespace + rest of line
const MARKER = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/

/** Pure change computation for continuing (or ending) a markdown list on Enter. */
export function continueListSpec(state: EditorState): TransactionSpec | null {
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  if (head !== line.to) return null // only continue at end of line
  const m = MARKER.exec(line.text)
  if (!m) return null
  const [, indent, marker, ws, rest] = m

  if (rest === '') {
    // empty item → drop the marker, ending the list
    const from = line.from + indent.length
    return { changes: { from, to: from + marker.length + ws.length }, selection: { anchor: from } }
  }
  const next = /^\d/.test(marker) ? marker.replace(/\d+/, n => String(Number(n) + 1)) : marker
  const insert = '\n' + indent + next + ' '
  return { changes: { from: head, insert }, selection: { anchor: head + insert.length } }
}

export const continueList: Command = view => {
  const spec = continueListSpec(view.state)
  if (!spec) return false
  view.dispatch(view.state.update({ ...spec, userEvent: 'input' }))
  return true
}
