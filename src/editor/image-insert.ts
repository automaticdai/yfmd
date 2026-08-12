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

async function insertImageFile(view: EditorView, file: File): Promise<void> {
  const ext = MIME_EXT[file.type] ?? 'png'
  const data = new Uint8Array(await file.arrayBuffer())
  const src = await view.state.facet(imageSaver)(data, ext)
  if (src) insertImage(view, file.name || 'image', src)
}

/** Paste handler: intercept a clipboard image, persist it, insert a reference. */
export function imagePasteHandler(event: ClipboardEvent, view: EditorView): boolean {
  const items = event.clipboardData?.items
  if (!items) return false
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    void insertImageFile(view, file)
    return true
  }
  return false
}

/** Drop handler: intercept an image file dropped into the editor. */
export function imageDropHandler(event: DragEvent, view: EditorView): boolean {
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return false
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      void insertImageFile(view, file)
      return true
    }
  }
  return false
}

/** Allow image files to be dropped (preventDefault on dragover). */
export function imageDragOverHandler(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}
