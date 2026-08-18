import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { EditorView, WidgetType } from '@codemirror/view'
import katex from 'katex'

export interface MathRange { from: number; to: number; tex: string; block: boolean }

const CODE_NODES = new Set(['FencedCode', 'CodeBlock', 'InlineCode', 'Comment'])

function codeRanges(state: EditorState): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  syntaxTree(state).iterate({
    enter(node): boolean | void {
      if (CODE_NODES.has(node.name)) {
        ranges.push([node.from, node.to])
        return false
      }
    },
  })
  return ranges
}

export function findMathRanges(state: EditorState): MathRange[] {
  const text = state.doc.toString()
  const code = codeRanges(state)
  const inCode = (pos: number) => code.some(([f, t]) => pos >= f && pos < t)

  const out: MathRange[] = []
  const taken: [number, number][] = []

  // Scan for block math $$...$$
  let i = 0
  while (i < text.length) {
    if (text.startsWith('$$', i)) {
      if (inCode(i) || (i > 0 && text[i - 1] === '\\')) {
        i += 2
        continue
      }
      let closeIdx = -1
      let j = i + 2
      while (j < text.length) {
        if (text.startsWith('$$', j)) {
          if (!inCode(j) && text[j - 1] !== '\\') {
            closeIdx = j
            break
          }
          j += 2
          continue
        }
        j++
      }
      if (closeIdx !== -1) {
        const from = i
        const to = closeIdx + 2
        const lineFrom = state.doc.lineAt(from)
        const lineTo = state.doc.lineAt(to)
        const block =
          text.slice(lineFrom.from, from).trim() === '' && text.slice(to, lineTo.to).trim() === ''
        const tex = text.slice(from + 2, closeIdx).trim()
        out.push({ from, to, tex, block })
        taken.push([from, to])
        i = to
        continue
      }
    }
    i++
  }

  // Scan for inline math $...$
  i = 0
  while (i < text.length) {
    if (text[i] === '$') {
      if (
        inCode(i) ||
        (i > 0 && text[i - 1] === '$') ||
        (i + 1 < text.length && text[i + 1] === '$') ||
        (i > 0 && text[i - 1] === '\\') ||
        taken.some(([a, b]) => i >= a && i < b)
      ) {
        i++
        continue
      }
      let closeIdx = -1
      let j = i + 1
      while (j < text.length && text[j] !== '\n') {
        if (text[j] === '$') {
          if (!inCode(j) && text[j - 1] !== '\\' && !taken.some(([a, b]) => j >= a && j < b)) {
            closeIdx = j
            break
          }
        }
        j++
      }
      if (closeIdx !== -1) {
        const from = i
        const to = closeIdx + 1
        const tex = text.slice(from + 1, closeIdx)
        if (
          !/^\s|\s$/.test(tex) &&
          !/\d/.test(text[to] ?? '') &&
          (to >= text.length || text[to] !== '$')
        ) {
          out.push({ from, to, tex, block: false })
          i = to
          continue
        }
      }
    }
    i++
  }

  return out.sort((a, b) => a.from - b.from)
}

const mathCache = new Map<string, string>()

export class MathWidget extends WidgetType {
  constructor(readonly tex: string, readonly display: boolean) { super() }
  eq(other: MathWidget) { return other.tex === this.tex && other.display === this.display }
  get estimatedHeight() { return this.display ? 60 : -1 }
  toDOM(view: EditorView) {
    const el = document.createElement(this.display ? 'div' : 'span')
    el.className = this.display ? 'cm-math-block' : 'cm-math-inline'
    if (!this.tex) {
      el.innerHTML = '<span class="cm-math-empty" style="color: var(--fg-muted); font-style: italic;">$$ (empty) $$</span>'
    } else {
      const key = (this.display ? 'D' : 'I') + this.tex
      let html = mathCache.get(key)
      if (html === undefined) {
        html = katex.renderToString(this.tex, { displayMode: this.display, throwOnError: false })
        mathCache.set(key, html)
      }
      el.innerHTML = html
    }
    el.addEventListener('mousedown', e => {
      e.preventDefault()
      const pos = view.posAtDOM(el)
      if (pos >= 0) {
        view.dispatch({ selection: { anchor: pos } })
        view.focus()
      }
    })
    return el
  }
  ignoreEvent() { return true }
}
