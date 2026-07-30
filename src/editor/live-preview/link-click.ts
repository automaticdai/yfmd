import { syntaxTree } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/** Ctrl/Cmd+Click a link (or bare URL/autolink) to open it externally. */
export function linkClick(openExternal: (url: string) => void): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!event.ctrlKey && !event.metaKey) return false
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false
      let node = syntaxTree(view.state).resolveInner(pos, 1)
      let url: string | null = null
      for (let n: typeof node | null = node; n; n = n.parent) {
        if (n.name === 'Link') {
          const urlNode = n.getChild('URL')
          if (urlNode) url = view.state.sliceDoc(urlNode.from, urlNode.to)
          break
        }
        if (n.name === 'URL' || n.name === 'Autolink') {
          url = view.state.sliceDoc(n.from, n.to).replace(/^<|>$/g, '')
          break
        }
      }
      if (!url) return false
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url
      event.preventDefault()
      openExternal(url)
      return true
    },
  })
}
