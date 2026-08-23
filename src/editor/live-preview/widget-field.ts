import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import { frontmatterRange, insideFrontmatter } from '../frontmatter'
import { selectionTouches } from './cursor-context'
import { imageResolver, rebuildWidgets, uiTheme } from './facets'
import { MathWidget } from './math'
import { MermaidWidget } from './mermaid-widget'
import { TableWidget } from './table'
import { getMathRanges } from './analysis'

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

/** Build every block widget ignoring selection (selection is applied later as a filter). */
export function buildFullWidgets(state: EditorState): DecorationSet {
  const widgets: Range<Decoration>[] = []
  const resolve = state.facet(imageResolver)
  const theme = state.facet(uiTheme)
  const frontmatter = frontmatterRange(state)
  const mathRanges = getMathRanges(state)
  const insideMath = (from: number, to: number) =>
    mathRanges.some(m => from >= m.from && to <= m.to)

  syntaxTree(state).iterate({
    enter(node): boolean | void {
      // the fences are frontmatter delimiters, not horizontal rules
      if (insideFrontmatter(frontmatter, node.from, node.to)) return false
      if (insideMath(node.from, node.to)) return false
      if (node.name === 'FencedCode') {
        const info = childText(state, node.node, 'CodeInfo').trim().toLowerCase()
        if (info === 'mermaid') {
          const lineFrom = state.doc.lineAt(node.from)
          const lineTo = state.doc.lineAt(node.to)
          const code = childText(state, node.node, 'CodeText')
          widgets.push(
            Decoration.replace({ widget: new MermaidWidget(code, theme), block: true })
              .range(lineFrom.from, lineTo.to))
        }
        return false
      }
      if (node.name === 'Image') {
        const src = childText(state, node.node, 'URL')
        const raw = state.sliceDoc(node.from, node.to)
        const alt = /^!\[([^\]]*)\]/.exec(raw)?.[1] ?? ''
        widgets.push(
          Decoration.replace({ widget: new ImageWidget(resolve(src), alt) }).range(node.from, node.to))
        return false
      }
      if (node.name === 'Table') {
        const lineFrom = state.doc.lineAt(node.from)
        const lineTo = state.doc.lineAt(node.to)
        widgets.push(
          Decoration.replace({ widget: new TableWidget(state.doc.sliceString(lineFrom.from, lineTo.to)), block: true })
            .range(lineFrom.from, lineTo.to))
        return false
      }
      if (node.name === 'HorizontalRule') {
        widgets.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to))
        return false
      }
    },
  })

  for (const m of mathRanges) {
    if (m.block) {
      const lineFrom = state.doc.lineAt(m.from)
      const lineTo = state.doc.lineAt(m.to)
      widgets.push(
        Decoration.replace({ widget: new MathWidget(m.tex, true), block: true })
          .range(lineFrom.from, lineTo.to))
    } else {
      widgets.push(
        Decoration.replace({ widget: new MathWidget(m.tex, false) }).range(m.from, m.to))
    }
  }

  return Decoration.set(widgets, true)
}

/** Reveal a widget's source when the cursor touches it. */
function applySelectionToWidgets(full: DecorationSet, state: EditorState): DecorationSet {
  return full.update({ filter: (from, to) => !selectionTouches(state, from, to) })
}

/** Pure full build with selection applied (kept for tests and direct use). */
export function buildWidgetDecorations(state: EditorState): DecorationSet {
  return applySelectionToWidgets(buildFullWidgets(state), state)
}

interface WidgetFieldValue { full: DecorationSet; filtered: DecorationSet }

export const widgetField = StateField.define<WidgetFieldValue>({
  create: state => {
    const full = buildFullWidgets(state)
    return { full, filtered: applySelectionToWidgets(full, state) }
  },
  update(value, tr) {
    if (
      tr.docChanged ||
      tr.effects.some(e => e.is(rebuildWidgets))
    ) {
      const full = buildFullWidgets(tr.state)
      return { full, filtered: applySelectionToWidgets(full, tr.state) }
    }
    if (!tr.startState.selection.eq(tr.state.selection)) {
      return { full: value.full, filtered: applySelectionToWidgets(value.full, tr.state) }
    }
    return value
  },
  provide: f => EditorView.decorations.from(f, value => value.filtered),
})
