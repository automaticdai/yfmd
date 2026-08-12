import { type Extension } from '@codemirror/state'
import { EditorView, highlightActiveLine } from '@codemirror/view'

/** Extensions for focus mode (dim non-active lines) and typewriter mode (center the cursor). */
export function writingModeExtensions(focus: boolean, typewriter: boolean): Extension {
  const exts: Extension[] = []
  if (focus) {
    exts.push(highlightActiveLine(), EditorView.editorAttributes.of({ class: 'cm-focus-mode' }))
  }
  if (typewriter) {
    exts.push(EditorView.updateListener.of(update => {
      if (update.selectionSet) {
        const head = update.state.selection.main.head
        update.view.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) })
      }
    }))
  }
  return exts
}
