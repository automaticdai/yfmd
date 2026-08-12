import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

const PAIRS: Record<string, string> = {
  '`': '``',
  '[': '[]',
  '(': '()',
  '{': '{}',
}

// Closers (and the backtick, which closes itself) skip over an identical following char.
const CLOSERS = new Set(['`', ']', ')', '}'])

/** Pure change computation for auto-pairing a typed opener, or skipping over a closer. */
export function autoPairSpec(state: EditorState, from: number, to: number, text: string): TransactionSpec | null {
  if (text.length !== 1) return null
  const ch = text

  if (from === to && CLOSERS.has(ch) && state.sliceDoc(to, to + 1) === ch) {
    return { selection: { anchor: to + 1 } }
  }

  const pair = PAIRS[ch]
  if (!pair) return null
  const open = pair.slice(0, 1)
  const close = pair.slice(1)

  const changes = state.changeByRange(range => {
    if (range.empty) {
      return {
        changes: { from: range.from, insert: pair },
        range: EditorSelection.cursor(range.from + open.length),
      }
    }
    return {
      changes: [
        { from: range.from, insert: open },
        { from: range.to, insert: close },
      ],
      range: EditorSelection.range(range.from + open.length, range.to + open.length),
    }
  })
  return { ...changes, userEvent: 'input', scrollIntoView: true }
}

export function autoPairHandler(view: EditorView, from: number, to: number, text: string): boolean {
  const spec = autoPairSpec(view.state, from, to, text)
  if (!spec) return false
  view.dispatch(view.state.update(spec))
  return true
}
