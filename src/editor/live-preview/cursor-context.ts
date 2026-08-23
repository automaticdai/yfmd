import type { EditorState } from '@codemirror/state'

/** True if a collapsed cursor sits inside [from, to] (boundary contact counts).
 * Range selections are excluded so dragging over a region keeps its source
 * hidden instead of reflowing text under the selection. */
export function selectionTouches(state: EditorState, from: number, to: number): boolean {
  return state.selection.ranges.some(r => r.empty && r.from >= from && r.from <= to)
}

/** True if a collapsed cursor sits on the line containing pos. */
export function selectionTouchesLine(state: EditorState, pos: number): boolean {
  const line = state.doc.lineAt(pos)
  return selectionTouches(state, line.from, line.to)
}
