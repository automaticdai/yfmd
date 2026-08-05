import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import { selectionTouches, selectionTouchesLine } from './cursor-context'
import { imageResolver, rebuildWidgets, uiTheme } from './facets'
import { MathWidget, findMathRanges } from './math'
import { MermaidWidget } from './mermaid-widget'

export function childText(state: EditorState, node: SyntaxNode, type: string): string {
  const child = node.getChild(type)
  return child ? state.sliceDoc(child.from, child.to) : ''
}

function placeCursor(view: EditorView, el: HTMLElement) {
  el.addEventListener('mousedown', e => {
    e.preventDefault()
    const pos = view.posAtDOM(el)
    view.dispatch({ selection: { anchor: pos } })
    view.focus()
  })
}

class ImageWidget extends WidgetType {
  constructor(readonly resolved: string, readonly alt: string) { super() }
  eq(other: ImageWidget) { return other.resolved === this.resolved && other.alt === this.alt }
  toDOM(view: EditorView) {
    const img = document.createElement('img')
    img.src = this.resolved
    img.alt = this.alt
    img.className = 'cm-image-widget'
    img.onerror = () => {
      const broken = document.createElement('span')
      broken.className = 'cm-image-broken'
      broken.textContent = `image not found: ${this.alt || this.resolved}`
      placeCursor(view, broken)
      img.replaceWith(broken)
    }
    placeCursor(view, img)
    return img
  }
  ignoreEvent() { return true }
}

class HrWidget extends WidgetType {
  eq() { return true }
  toDOM(view: EditorView) {
    const hr = document.createElement('hr')
    hr.className = 'cm-hr-widget'
    placeCursor(view, hr)
    return hr
  }
  ignoreEvent() { return true }
}

export function buildWidgetDecorations(state: EditorState): DecorationSet {
  const widgets: Range<Decoration>[] = []
  const resolve = state.facet(imageResolver)
  const theme = state.facet(uiTheme)

  syntaxTree(state).iterate({
    enter(node): boolean | void {
      if (node.name === 'FencedCode') {
        const info = childText(state, node.node, 'CodeInfo').trim().toLowerCase()
        if (info === 'mermaid') {
          const lineFrom = state.doc.lineAt(node.from)
          const lineTo = state.doc.lineAt(node.to)
          if (!selectionTouches(state, lineFrom.from, lineTo.to)) {
            const code = childText(state, node.node, 'CodeText')
            widgets.push(
              Decoration.replace({ widget: new MermaidWidget(code, theme), block: true })
                .range(lineFrom.from, lineTo.to))
          }
          return false
        }
        return // non-mermaid fences keep default handling (highlighted source)
      }
      if (node.name === 'Image') {
        if (!selectionTouches(state, node.from, node.to)) {
          const src = childText(state, node.node, 'URL')
          const raw = state.sliceDoc(node.from, node.to)
          const alt = /^!\[([^\]]*)\]/.exec(raw)?.[1] ?? ''
          widgets.push(
            Decoration.replace({ widget: new ImageWidget(resolve(src), alt) }).range(node.from, node.to))
        }
        return false
      }
      if (node.name === 'HorizontalRule') {
        if (!selectionTouchesLine(state, node.from)) {
          widgets.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to))
        }
        return false
      }
    },
  })

  for (const m of findMathRanges(state)) {
    if (m.block) {
      const lineFrom = state.doc.lineAt(m.from)
      const lineTo = state.doc.lineAt(m.to)
      if (selectionTouches(state, lineFrom.from, lineTo.to)) continue
      widgets.push(
        Decoration.replace({ widget: new MathWidget(m.tex, true), block: true })
          .range(lineFrom.from, lineTo.to))
    } else {
      if (selectionTouches(state, m.from, m.to)) continue
      // Inline math and mid-line $$..$$ both render inline: a display-mode widget
      // is block-level (KaTeX wraps it in .katex-display) and would break line flow.
      widgets.push(
        Decoration.replace({ widget: new MathWidget(m.tex, false) }).range(m.from, m.to))
    }
  }

  return Decoration.set(widgets, true)
}

export const widgetField = StateField.define<DecorationSet>({
  create: buildWidgetDecorations,
  update(deco, tr) {
    if (
      tr.docChanged ||
      !tr.startState.selection.eq(tr.state.selection) ||
      tr.effects.some(e => e.is(rebuildWidgets))
    ) {
      return buildWidgetDecorations(tr.state)
    }
    return deco.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f),
})
