import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { imageSaver } from './live-preview/facets'

/** Pure change computation to insert an image reference at the current selection. */
export function insertImageSpec(state: EditorState, alt: string, src: string): TransactionSpec {
  const insert = `![${alt}](${src})`
  const changes = state.changeByRange(range => ({
    changes: { from: range.from, to: range.to, insert },
    range: EditorSelection.cursor(range.from + insert.length),
  }))
  return { ...changes, userEvent: 'input', scrollIntoView: true }
}

export function insertImage(view: EditorView, alt: string, src: string): void {
  view.dispatch(view.state.update(insertImageSpec(view.state, alt, src)))
  view.focus()
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

/**
 * Paste handler: intercept a clipboard image, persist it via the imageSaver
 * facet, and insert a reference. Returns true to suppress the default text paste.
 */
export function imagePasteHandler(event: ClipboardEvent, view: EditorView): boolean {
  const items = event.clipboardData?.items
  if (!items) return false
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    const saver = view.state.facet(imageSaver)
    void (async () => {
      const ext = MIME_EXT[item.type] ?? 'png'
      const data = new Uint8Array(await file.arrayBuffer())
      const src = await saver(data, ext)
      if (src) insertImage(view, file.name || 'image', src)
    })()
    return true
  }
  return false
}
