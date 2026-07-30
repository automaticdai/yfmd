import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import welcome from './assets/welcome.md?raw'
import { createExtensions } from './editor/setup'

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: welcome,
        extensions: createExtensions({
          onDocChanged() {},
          onToggleSource() {},
          openExternal(url) { window.open(url, '_blank', 'noopener') },
        }),
      }),
      parent: hostRef.current,
    })
    viewRef.current = view
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__yfmdView = view
    }
    return () => { view.destroy(); viewRef.current = null }
  }, [])

  return (
    <div className="app">
      <div className="app-body">
        <main className="editor-pane"><div ref={hostRef} style={{ height: '100%' }} /></main>
      </div>
    </div>
  )
}
