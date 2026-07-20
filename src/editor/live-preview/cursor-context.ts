import type { EditorState } from '@codemirror/state'

/** True if any selection range touches [from, to] (boundary contact counts). */
export function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some(r => r.from <= to && r.to >= from)
}

/** True if any selection range touches the line containing pos. */
export function selectionTouchesLine(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos)
  return selectionTouches(state, line.from, line.to)
}
