import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { openSearchPanel } from '@codemirror/search'
import welcome from './assets/welcome.md?raw'
import { AboutDialog } from './app/AboutDialog'
import { ConfirmDialog } from './app/ConfirmDialog'
import { type ConfirmResult, type DocMeta, DocumentController } from './app/document-controller'
import { setLocale, t } from './app/i18n'
import { makeImageSaver } from './app/image-saver'
import { countDocStats, type DocStats } from './app/word-count'
import { clearRecent, loadRecent } from './app/recent-files'
import { MenuBar } from './app/MenuBar'
import { StatusBar } from './app/StatusBar'
import {
  headingCommand, insertCodeBlock, insertHorizontalRule, insertMathBlock, insertTable,
  listCommand, toggleQuote,
} from './editor/block-commands'
import { insertImage } from './editor/image-insert'
import { addTableColumn, addTableRow, removeTableColumn, removeTableRow } from './editor/table-edit'
import { insertToc } from './editor/toc'
import {
  insertLink, setLivePreview, toggleBold, toggleInlineCode, toggleItalic, toggleStrikethrough,
} from './editor/commands'
import { exportHtml, exportPdf } from './export/export'
import { imageResolver, imageSaver, rebuildWidgets, uiTheme } from './editor/live-preview/facets'
import { createExtensions, codeLineNumbersCompartment, imageSaverCompartment, resolverCompartment, themeCompartment, writingModeCompartment } from './editor/setup'
import { codeLineNumbersField } from './editor/code-line-numbers'
import { writingModeExtensions } from './editor/writing-mode'
import { extractOutline, type OutlineItem } from './outline/outline'
import { BODY_FONTS, CODE_FONTS, fontStack } from './app/fonts'
import { loadSettings, saveSettings, type Settings, type ThemeName, THEMES } from './app/settings'
import { SettingsDialog } from './app/SettingsDialog'
import { createFileService, type FileService } from './services/file-service'
import { Sidebar } from './sidebar/Sidebar'

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const fsRef = useRef<FileService | null>(null)
  const controllerRef = useRef<DocumentController | null>(null)
  const confirmResolve = useRef<((r: ConfirmResult) => void) | null>(null)
  const saverRef = useRef<ReturnType<typeof makeImageSaver>>(async () => null)

  const [meta, setMeta] = useState<DocMeta>({ path: null, dirty: false, folderPath: null, tree: null })
  const [sourceMode, setSourceMode] = useState(false)
  const sourceModeRef = useRef(false)
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  // Sync the module-level locale before children render so t() reflects settings.
  setLocale(settings.language)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [typewriterMode, setTypewriterMode] = useState(false)
  const [lineNumbers, setLineNumbers] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [recent, setRecent] = useState<string[]>(() => loadRecent())
  const [stats, setStats] = useState<DocStats>(() => countDocStats(''))
  const outlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleAutosave = useCallback(() => {
    if (!settingsRef.current.autosave) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      const c = controllerRef.current
      if (c && c.meta.dirty && c.meta.path !== null) void c.save()
    }, 2000)
  }, [])

  const scheduleOutline = useCallback(() => {
    if (outlineTimer.current) clearTimeout(outlineTimer.current)
    outlineTimer.current = setTimeout(() => {
      if (viewRef.current) {
        setOutline(extractOutline(viewRef.current.state))
        setStats(countDocStats(viewRef.current.state.doc.toString()))
      }
    }, 200)
  }, [])

  const notify = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 4000)
  }, [])

  const openExternal = useCallback((url: string) => {
    fsRef.current?.openExternal(url)
  }, [])

  /** Push the current theme into the editor (mermaid re-render etc.). */
  const applyEditorTheme = useCallback(() => {
    const dark = THEMES.find(t => t.id === settingsRef.current.theme)?.dark ?? false
    viewRef.current?.dispatch({
      effects: [
        themeCompartment.reconfigure(uiTheme.of(dark ? 'dark' : 'light')),
        rebuildWidgets.of(null),
      ],
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
          onDocChanged: () => { controllerRef.current?.markDirty(); scheduleOutline(); scheduleAutosave() },
          onToggleSource: () => toggleSource(),
          openExternal,
        }),
      }),
      parent: hostRef.current,
    })
    viewRef.current = view
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__yfmdView = view
    applyEditorTheme()
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
              onDocChanged: () => { controllerRef.current?.markDirty(); scheduleOutline(); scheduleAutosave() },
              onToggleSource: () => toggleSource(),
              openExternal,
            }),
          }))
          scheduleOutline()
          sourceModeRef.current = false
          setSourceMode(false)
          applyEditorTheme()
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
          setRecent(loadRecent())
          const p = m.path
          const fs = fsRef.current
          if (fs) {
            const saver = makeImageSaver(fs, p)
            saverRef.current = saver
            view.dispatch({
              effects: [
                resolverCompartment.reconfigure(imageResolver.of(src => fs.resolveResource(p, src))),
                imageSaverCompartment.reconfigure(imageSaver.of(saver)),
                rebuildWidgets.of(null),
              ],
            })
          }
        },
      })
      const saver = makeImageSaver(fs, null)
      saverRef.current = saver
      view.dispatch({ effects: [imageSaverCompartment.reconfigure(imageSaver.of(saver))] })
      controllerRef.current = controller
    })

    return () => { disposed = true; view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // apply + persist settings whenever they change (also on first mount, after the editor exists)
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', settings.theme)
    root.style.setProperty('--editor-max-width', `${settings.maxWidth}rem`)
    root.style.setProperty('--editor-margin', `${settings.sideMargin}rem`)
    root.style.setProperty('--editor-font-size', `${settings.fontSize}px`)
    root.style.setProperty('--editor-line-height', String(settings.lineHeight))
    // no stack = "follow theme": clear the override so the stylesheet decides
    const body = fontStack(settings.bodyFont, BODY_FONTS)
    if (body) root.style.setProperty('--editor-font', body)
    else root.style.removeProperty('--editor-font')
    const code = fontStack(settings.codeFont, CODE_FONTS)
    if (code) root.style.setProperty('--code-font', code)
    else root.style.removeProperty('--code-font')
    saveSettings(settings)
    applyEditorTheme()
  }, [settings, applyEditorTheme])

  // focus / typewriter mode are editor-only toggles, not persisted settings
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: writingModeCompartment.reconfigure(writingModeExtensions(focusMode, typewriterMode)),
    })
  }, [focusMode, typewriterMode])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: codeLineNumbersCompartment.reconfigure(lineNumbers ? codeLineNumbersField : []),
    })
  }, [lineNumbers])

  /** Dirty-guard then leave: destroys the Tauri window or closes the browser tab. */
  const quitApp = useCallback(async () => {
    const c = controllerRef.current
    if (c && !(await c.guardDirty())) return
    if ('__TAURI_INTERNALS__' in window) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().destroy()
    } else {
      window.close()
      notify(t('toast.closeTab'))
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
      if (key === ',') { e.preventDefault(); setSettingsOpen(o => !o); return }
      if (key === 'l' && e.shiftKey) { e.preventDefault(); setSidebarVisible(v => !v); return }
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
    if (action.startsWith('theme:')) {
      const id = action.slice('theme:'.length) as ThemeName
      if (THEMES.some(t => t.id === id)) setSettings(s => ({ ...s, theme: id }))
      return
    }
    if (action.startsWith('heading:')) {
      const level = Number(action.slice('heading:'.length)) as 0 | 1 | 2 | 3
      if (view) { headingCommand(level)(view); view.focus() }
      return
    }
    if (action.startsWith('open-recent://')) {
      void c?.openPath(action.slice('open-recent://'.length))
      return
    }
    if (action === 'clear-recent') {
      clearRecent()
      setRecent([])
      return
    }
    switch (action) {
      case 'new': void c?.newFile(); break
      case 'open-file': void c?.openFileViaDialog(); break
      case 'open-folder':
        void c?.openFolderViaDialog().then(() => {
          if (controllerRef.current?.meta.folderPath) setSidebarVisible(true)
        })
        break
      case 'save': void c?.save(); break
      case 'save-as': void c?.saveAs(); break
      case 'export-html': {
        const fs = fsRef.current
        if (view && fs) {
          const p = controllerRef.current?.meta.path
          const title = p ? p.slice(p.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') : 'untitled'
          void exportHtml(fs, view.state.doc.toString(), title)
            .then(saved => { if (saved) notify(t('toast.exported', { path: saved })) })
            .catch(err => notify(t('toast.exportFailed', { error: err instanceof Error ? err.message : String(err) })))
        }
        break
      }
      case 'export-pdf': {
        if (view) {
          const p = controllerRef.current?.meta.path
          const title = p ? p.slice(p.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') : 'untitled'
          void exportPdf(view.state.doc.toString(), title)
            .catch(err => notify(t('toast.exportFailed', { error: err instanceof Error ? err.message : String(err) })))
        }
        break
      }
      case 'bold': if (view) { toggleBold(view); view.focus() } break
      case 'italic': if (view) { toggleItalic(view); view.focus() } break
      case 'strike': if (view) { toggleStrikethrough(view); view.focus() } break
      case 'code': if (view) { toggleInlineCode(view); view.focus() } break
      case 'link': if (view) { insertLink(view); view.focus() } break
      case 'insert-image': {
        const fs = fsRef.current
        if (view && fs) {
          void fs.openImageDialog().then(async picked => {
            if (!picked) return
            const ext = picked.path.match(/\.(\w+)$/)?.[1] ?? 'png'
            const src = await saverRef.current(picked.data, ext)
            if (src) insertImage(view, picked.path.slice(picked.path.lastIndexOf('/') + 1), src)
          })
        }
        break
      }
      case 'quote': if (view) { toggleQuote(view); view.focus() } break
      case 'list-unordered': if (view) { listCommand('unordered')(view); view.focus() } break
      case 'list-ordered': if (view) { listCommand('ordered')(view); view.focus() } break
      case 'table': if (view) { insertTable(view); view.focus() } break
      case 'table-add-row': if (view) { addTableRow(view); view.focus() } break
      case 'table-del-row': if (view) { removeTableRow(view); view.focus() } break
      case 'table-add-col': if (view) { addTableColumn(view); view.focus() } break
      case 'table-del-col': if (view) { removeTableColumn(view); view.focus() } break
      case 'code-block': if (view) { insertCodeBlock(view); view.focus() } break
      case 'math-block': if (view) { insertMathBlock(view); view.focus() } break
      case 'hr': if (view) { insertHorizontalRule(view); view.focus() } break
      case 'toc': if (view) { insertToc(view); view.focus() } break
      case 'find': if (view) { openSearchPanel(view) } break
      case 'settings': setSettingsOpen(true); break
      case 'about': setAboutOpen(true); break
      case 'focus-mode': setFocusMode(v => !v); break
      case 'typewriter-mode': setTypewriterMode(v => !v); break
      case 'line-numbers': setLineNumbers(v => !v); break
      case 'quit': void quitApp(); break
      case 'toggle-sidebar': setSidebarVisible(v => !v); break
      case 'source-mode': toggleSource(); break
    }
  }, [notify, quitApp, toggleSource])

  const fileName = meta.path ? meta.path.slice(meta.path.lastIndexOf('/') + 1) : 'untitled'
  const checkedActions = new Set<string>([`theme:${settings.theme}`])
  if (focusMode) checkedActions.add('focus-mode')
  if (typewriterMode) checkedActions.add('typewriter-mode')
  if (lineNumbers) checkedActions.add('line-numbers')

  return (
    <div className="app">
      <MenuBar onAction={onAction} checkedActions={checkedActions} recent={recent} />
      <div className="app-body">
        {sidebarVisible && (
          <Sidebar
            tree={meta.tree}
            folderPath={meta.folderPath}
            outline={outline}
            defaultTab={settings.sidebarTab}
            onOpenFile={path => void controllerRef.current?.openPath(path)}
            onNewFile={path => void controllerRef.current?.createFile(path)}
            onNewFolder={path => void controllerRef.current?.createFolder(path)}
            onRename={(oldPath, newPath) => void controllerRef.current?.renamePath(oldPath, newPath)}
            onDelete={path => void controllerRef.current?.deletePath(path)}
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
      <StatusBar path={meta.path} dirty={meta.dirty} sourceMode={sourceMode} stats={stats} />
      {confirmOpen && (
        <ConfirmDialog
          fileName={fileName}
          onChoice={choice => { setConfirmOpen(false); confirmResolve.current?.(choice) }}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
