import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { EditorView, WidgetType } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import katex from 'katex'

export interface MathRange { from: number; to: number; tex: string; block: boolean }

const BLOCK_RE = /\$\$([\s\S]+?)\$\$/g
const INLINE_RE = /\$([^$\n]+?)\$/g
const CODE_NODES = new Set(['FencedCode', 'CodeBlock', 'InlineCode'])

function inCode(state: EditorState, pos: number): boolean {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (CODE_NODES.has(n.name)) return true
  }
  return false
}

export function findMathRanges(state: EditorState): MathRange[] {
  const text = state.doc.toString()
  const out: MathRange[] = []
  const taken: [number, number][] = []

  BLOCK_RE.lastIndex = 0
  for (let m; (m = BLOCK_RE.exec(text)); ) {
    const from = m.index
    const to = from + m[0].length
    if (text[from - 1] === '\\' || inCode(state, from) || inCode(state, to - 1)) continue
    const lineFrom = state.doc.lineAt(from)
    const lineTo = state.doc.lineAt(to)
    const block =
      text.slice(lineFrom.from, from).trim() === '' && text.slice(to, lineTo.to).trim() === ''
    out.push({ from, to, tex: m[1].trim(), block })
    taken.push([from, to])
  }

  INLINE_RE.lastIndex = 0
  for (let m; (m = INLINE_RE.exec(text)); ) {
    const from = m.index
    const to = from + m[0].length
    const tex = m[1]
    if (taken.some(([a, b]) => from < b && to > a)) continue
    if (text[from - 1] === '$' || text[to] === '$' || text[from - 1] === '\\') continue
    if (/^\s|\s$/.test(tex)) continue
    if (/\d/.test(text[to] ?? '')) continue
    if (inCode(state, from) || inCode(state, to - 1)) continue
    out.push({ from, to, tex, block: false })
  }
  return out.sort((a, b) => a.from - b.from)
}

const mathCache = new Map<string, string>()

export class MathWidget extends WidgetType {
  constructor(readonly tex: string, readonly display: boolean) { super() }
  eq(other: MathWidget) { return other.tex === this.tex && other.display === this.display }
  toDOM(view: EditorView) {
    const el = document.createElement(this.display ? 'div' : 'span')
    el.className = this.display ? 'cm-math-block' : 'cm-math-inline'
    const key = (this.display ? 'D' : 'I') + this.tex
    let html = mathCache.get(key)
    if (html === undefined) {
      html = katex.renderToString(this.tex, { displayMode: this.display, throwOnError: false })
      mathCache.set(key, html)
    }
    el.innerHTML = html
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
