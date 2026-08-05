import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { openSearchPanel } from '@codemirror/search'
import welcome from './assets/welcome.md?raw'
import { ConfirmDialog } from './app/ConfirmDialog'
import { type ConfirmResult, type DocMeta, DocumentController } from './app/document-controller'
import { MenuBar } from './app/MenuBar'
import { StatusBar } from './app/StatusBar'
import {
  insertLink, setLivePreview, toggleBold, toggleInlineCode, toggleItalic, toggleStrikethrough,
} from './editor/commands'
import { exportHtml, exportPdf } from './export/export'
import { imageResolver, rebuildWidgets, uiTheme } from './editor/live-preview/facets'
import { createExtensions, resolverCompartment, themeCompartment } from './editor/setup'
import { extractOutline, type OutlineItem } from './outline/outline'
import { createFileService, type FileService } from './services/file-service'
import { Sidebar } from './sidebar/Sidebar'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  const stored = localStorage.getItem('yfmd-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const fsRef = useRef<FileService | null>(null)
  const controllerRef = useRef<DocumentController | null>(null)
  const confirmResolve = useRef<((r: ConfirmResult) => void) | null>(null)

  const [meta, setMeta] = useState<DocMeta>({ path: null, dirty: false, folderPath: null, tree: null })
  const [sourceMode, setSourceMode] = useState(false)
  const sourceModeRef = useRef(false)
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const outlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleOutline = useCallback(() => {
    if (outlineTimer.current) clearTimeout(outlineTimer.current)
    outlineTimer.current = setTimeout(() => {
      if (viewRef.current) setOutline(extractOutline(viewRef.current.state))
    }, 200)
  }, [])

  const notify = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const openExternal = useCallback((url: string) => {
    fsRef.current?.openExternal(url)
  }, [])

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('yfmd-theme', t)
    viewRef.current?.dispatch({
      effects: [themeCompartment.reconfigure(uiTheme.of(t)), rebuildWidgets.of(null)],
    })
  }, [])

  const toggleSource = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const next = !sourceModeRef.current
    sourceModeRef.current = next
    setSourceMode(next)
    setLivePreview(view, { openExternal }, !next)
  }, [openExternal])

  // mount editor + services once
  useEffect(() => {
    if (!hostRef.current || viewRef.current) return
    let disposed = false
    const view = new EditorView({
      state: EditorState.create({
        doc: welcome,
        extensions: createExtensions({
          onDocChanged: () => { controllerRef.current?.markDirty(); scheduleOutline() },
          onToggleSource: () => toggleSource(),
          openExternal,
        }),
      }),
      parent: hostRef.current,
    })
    viewRef.current = view
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__yfmdView = view
    applyTheme(initialTheme())
    scheduleOutline()

    createFileService().then(fs => {
      if (disposed) return
      fsRef.current = fs
      const controller = new DocumentController(fs, {
        getText: () => view.state.doc.toString(),
        setText: text => {
          view.setState(EditorState.create({
            doc: text,
            extensions: createExtensions({
              onDocChanged: () => { controllerRef.current?.markDirty(); scheduleOutline() },
              onToggleSource: () => toggleSource(),
              openExternal,
            }),
          }))
          scheduleOutline()
          sourceModeRef.current = false
          setSourceMode(false)
          applyTheme((localStorage.getItem('yfmd-theme') as Theme) ?? 'light')
          const path = controllerRef.current?.meta.path ?? null
          view.dispatch({
            effects: [
              resolverCompartment.reconfigure(
                imageResolver.of(src => fs.resolveResource(path, src))),
              rebuildWidgets.of(null),
            ],
          })
        },
        confirmDiscard: () =>
          new Promise<ConfirmResult>(resolve => {
            confirmResolve.current = resolve
            setConfirmOpen(true)
          }),
        notify,
        onMetaChange: m => {
          setMeta({ ...m })
          const p = m.path
          view.dispatch({
            effects: [
              resolverCompartment.reconfigure(
                imageResolver.of(src => (fsRef.current ? fsRef.current.resolveResource(p, src) : src))),
              rebuildWidgets.of(null),
            ],
          })
        },
      })
      controllerRef.current = controller
    })

    return () => { disposed = true; view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Dirty-guard then leave: destroys the Tauri window or closes the browser tab. */
  const quitApp = useCallback(async () => {
    const c = controllerRef.current
    if (c && !(await c.guardDirty())) return
    if ('__TAURI_INTERNALS__' in window) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().destroy()
    } else {
      window.close()
      notify('Close the browser tab to quit')
    }
  }, [notify])

  // dirty guard on native window close (Tauri)
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let disposed = false
    let unlisten: (() => void) | undefined
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow()
      void win.onCloseRequested(async event => {
        const c = controllerRef.current
        if (c?.meta.dirty) {
          event.preventDefault()
          if (await c.guardDirty()) void win.destroy()
        }
      }).then(fn => {
        // effect may have been cleaned up while the import was in flight
        if (disposed) fn()
        else unlisten = fn
      })
    })
    return () => { disposed = true; unlisten?.() }
  }, [])

  // dirty guard on browser close
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (controllerRef.current?.meta.dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // global shortcuts (file ops work even when the editor isn't focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      const c = controllerRef.current
      if (!c) return
      if (key === 's' && e.shiftKey) { e.preventDefault(); void c.saveAs() }
      else if (key === 's') { e.preventDefault(); void c.save() }
      else if (key === 'o') { e.preventDefault(); void c.openFileViaDialog() }
      else if (key === 'n') { e.preventDefault(); void c.newFile() }
      else if (key === 'q') { e.preventDefault(); void quitApp() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quitApp])

  const onAction = useCallback((action: string) => {
    const view = viewRef.current
    const c = controllerRef.current
    switch (action) {
      case 'new': void c?.newFile(); break
      case 'open-file': void c?.openFileViaDialog(); break
      case 'open-folder': void c?.openFolderViaDialog(); break
      case 'save': void c?.save(); break
      case 'save-as': void c?.saveAs(); break
      case 'export-html': {
        const fs = fsRef.current
        if (view && fs) {
          const p = controllerRef.current?.meta.path
          const title = p ? p.slice(p.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') : 'untitled'
          void exportHtml(fs, view.state.doc.toString(), title)
            .then(saved => { if (saved) notify(`Exported to ${saved}`) })
            .catch(err => notify(`Export failed: ${err instanceof Error ? err.message : String(err)}`))
        }
        break
      }
      case 'export-pdf': {
        if (view) {
          const p = controllerRef.current?.meta.path
          const title = p ? p.slice(p.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') : 'untitled'
          void exportPdf(view.state.doc.toString(), title)
            .catch(err => notify(`Export failed: ${err instanceof Error ? err.message : String(err)}`))
        }
        break
      }
      case 'bold': if (view) { toggleBold(view); view.focus() } break
      case 'italic': if (view) { toggleItalic(view); view.focus() } break
      case 'strike': if (view) { toggleStrikethrough(view); view.focus() } break
      case 'code': if (view) { toggleInlineCode(view); view.focus() } break
      case 'link': if (view) { insertLink(view); view.focus() } break
      case 'find': if (view) { openSearchPanel(view) } break
      case 'quit': void quitApp(); break
      case 'toggle-sidebar': setSidebarVisible(v => !v); break
      case 'source-mode': toggleSource(); break
      case 'theme': setTheme(t => { const next = t === 'dark' ? 'light' : 'dark'; applyTheme(next); return next }); break
    }
  }, [applyTheme, notify, quitApp, toggleSource])

  const fileName = meta.path ? meta.path.slice(meta.path.lastIndexOf('/') + 1) : 'untitled'

  return (
    <div className="app" data-app-theme={theme}>
      <MenuBar onAction={onAction} />
      <div className="app-body">
        {sidebarVisible && (
          <Sidebar
            tree={meta.tree}
            folderPath={meta.folderPath}
            outline={outline}
            onOpenFile={path => void controllerRef.current?.openPath(path)}
            onJump={pos => {
              const view = viewRef.current
              if (!view) return
              view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'start' }) })
              view.focus()
            }}
          />
        )}
        <main className="editor-pane"><div ref={hostRef} style={{ height: '100%' }} /></main>
      </div>
      <StatusBar path={meta.path} dirty={meta.dirty} sourceMode={sourceMode} />
      {confirmOpen && (
        <ConfirmDialog
          fileName={fileName}
          onChoice={choice => { setConfirmOpen(false); confirmResolve.current?.(choice) }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
