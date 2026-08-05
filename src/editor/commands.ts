import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { Command, EditorView } from '@codemirror/view'
import { livePreviewCompartment } from './setup'
import { type LivePreviewOptions, livePreviewExtensions } from './live-preview'

/** Pure change computation for marker toggling — exported for tests. */
export function wrapToggleChanges(state: EditorState, marker: string): TransactionSpec {
  const len = marker.length
  const changes = state.changeByRange(range => {
    const { from, to } = range
    const before = state.sliceDoc(Math.max(0, from - len), from)
    const after = state.sliceDoc(to, Math.min(state.doc.length, to + len))
    if (before === marker && after === marker) {
      return {
        changes: [{ from: from - len, to: from }, { from: to, to: to + len }],
        range: EditorSelection.range(from - len, to - len),
      }
    }
    const text = state.sliceDoc(from, to)
    if (text.startsWith(marker) && text.endsWith(marker) && text.length >= 2 * len) {
      return {
        changes: [{ from, to: from + len }, { from: to - len, to }],
        range: EditorSelection.range(from, to - 2 * len),
      }
    }
    return {
      changes: [{ from, insert: marker }, { from: to, insert: marker }],
      range: EditorSelection.range(from + len, to + len),
    }
  })
  return { ...changes, userEvent: 'input', scrollIntoView: true }
}

function markerCommand(marker: string): Command {
  return view => {
    view.dispatch(view.state.update(wrapToggleChanges(view.state, marker)))
    return true
  }
}

export const toggleBold = markerCommand('**')
export const toggleItalic = markerCommand('*')
export const toggleInlineCode = markerCommand('`')
export const toggleStrikethrough = markerCommand('~~')

export const insertLink: Command = view => {
  const { state } = view
  const changes = state.changeByRange(range => {
    const text = state.sliceDoc(range.from, range.to)
    const insert = `[${text}](url)`
    const urlFrom = range.from + text.length + 3
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlFrom, urlFrom + 3),
    }
  })
  view.dispatch(state.update({ ...changes, userEvent: 'input', scrollIntoView: true }))
  return true
}

/** Source mode off/on = empty vs full live-preview bundle in the compartment. */
export function setLivePreview(view: EditorView, opts: LivePreviewOptions, on: boolean): void {
  view.dispatch({
    effects: livePreviewCompartment.reconfigure(on ? livePreviewExtensions(opts) : []),
  })
}
