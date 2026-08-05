import { EditorView, WidgetType } from '@codemirror/view'
import mermaid from 'mermaid'

let initializedTheme: string | null = null
let idCounter = 0
const svgCache = new Map<string, string>()

function ensureInit(theme: 'light' | 'dark') {
  const want = theme === 'dark' ? 'dark' : 'default'
  if (initializedTheme !== want) {
    mermaid.initialize({ startOnLoad: false, theme: want, securityLevel: 'strict' })
    initializedTheme = want
    svgCache.clear()
  }
}

export class MermaidWidget extends WidgetType {
  constructor(readonly code: string, readonly theme: 'light' | 'dark') { super() }
  eq(other: MermaidWidget) { return other.code === this.code && other.theme === this.theme }
  get estimatedHeight() { return 140 }

  toDOM(view: EditorView) {
    const el = document.createElement('div')
    el.className = 'cm-mermaid'
    ensureInit(this.theme)
    const cached = svgCache.get(this.code)
    if (cached !== undefined) {
      el.innerHTML = cached
    } else {
      el.textContent = 'Rendering diagram…'
      mermaid
        .render(`yfmd-mermaid-${idCounter++}`, this.code)
        .then(({ svg }) => {
          svgCache.set(this.code, svg)
          el.innerHTML = svg
          view.requestMeasure()
        })
        .catch((err: unknown) => {
          el.textContent = ''
          const box = document.createElement('div')
          box.className = 'cm-widget-error'
          box.textContent = `Mermaid error: ${err instanceof Error ? err.message : String(err)}`
          el.appendChild(box)
          view.requestMeasure()
        })
    }
    el.addEventListener('mousedown', e => {
      e.preventDefault()
      const pos = view.posAtDOM(el)
      view.dispatch({ selection: { anchor: pos } })
      view.focus()
    })
    return el
  }
  ignoreEvent() { return true }
}
