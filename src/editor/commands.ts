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

/** Copy the main selection's text to the clipboard, then return focus to the editor. */
export function copySelection(view: EditorView): void {
  const { from, to } = view.state.selection.main
  const text = view.state.sliceDoc(from, to)
  if (navigator.clipboard) void navigator.clipboard.writeText(text).catch(() => {})
  view.focus()
}

/** Paste clipboard text as plain text at the cursor, then return focus to the editor. */
export async function pasteText(view: EditorView): Promise<void> {
  if (!navigator.clipboard) return
  try {
    const text = await navigator.clipboard.readText()
    view.dispatch(view.state.replaceSelection(text))
  } catch {
    // clipboard read denied or empty
  }
  view.focus()
}

/** Read the clipboard's HTML payload, if any. */
async function readClipboardHtml(): Promise<string | null> {
  if (!navigator.clipboard?.read) return null
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (item.types.includes('text/html')) {
        return await (await item.getType('text/html')).text()
      }
    }
    return null
  } catch {
    return null
  }
}

/** Paste clipboard content, converting rich text (HTML) to Markdown when available. */
export async function pasteRichText(view: EditorView): Promise<void> {
  const html = await readClipboardHtml()
  if (html) {
    const { htmlToMarkdown } = await import('./rich-paste')
    view.dispatch(view.state.replaceSelection(htmlToMarkdown(html)))
  } else {
    await pasteText(view)
  }
  view.focus()
}
