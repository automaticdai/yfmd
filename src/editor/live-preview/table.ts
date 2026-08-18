import { syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { EditorView, WidgetType } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import MarkdownIt from 'markdown-it'

export type CellAlign = 'left' | 'center' | 'right' | null
export interface ParsedTable { align: CellAlign[]; header: string[]; rows: string[][] }

export function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  let escaped = false
  for (const ch of s) {
    if (escaped) { cur += '\\' + ch; escaped = false }
    else if (ch === '\\') escaped = true
    else if (ch === '|') { cells.push(cur.trim()); cur = '' }
    else cur += ch
  }
  if (escaped) cur += '\\'
  cells.push(cur.trim())
  return cells
}

const DELIM_CELL = /^:?-+:?$/

export function parseTable(src: string): ParsedTable | null {
  const lines = src.split('\n').filter(l => l.trim() !== '')
  if (lines.length < 2) return null
  const delim = splitRow(lines[1])
  if (delim.length === 0 || !delim.every(c => DELIM_CELL.test(c))) return null
  const align: CellAlign[] = delim.map(c => {
    const l = c.startsWith(':')
    const r = c.endsWith(':')
    return l && r ? 'center' : r ? 'right' : l ? 'left' : null
  })
  return { align, header: splitRow(lines[0]), rows: lines.slice(2).map(splitRow) }
}

export function formatParsedTable(parsed: ParsedTable, explicitWidths?: number[]): string {
  const { align, header, rows } = parsed
  const ncol = Math.max(header.length, align.length, ...rows.map(r => r.length), 1)
  const widths = (explicitWidths ?? Array.from({ length: ncol }, (_, i) =>
    Math.max(3, (header[i] ?? '').length, ...rows.map(r => (r[i] ?? '').length))))
    .map(w => Math.max(1, Math.round(w)))
  const pad = (text: string, i: number) => {
    const extra = widths[i] - text.length
    if (align[i] === 'right') return ' '.repeat(extra) + text
    if (align[i] === 'center') {
      const left = Math.floor(extra / 2)
      return ' '.repeat(left) + text + ' '.repeat(extra - left)
    }
    return text + ' '.repeat(extra)
  }
  const fmtRow = (cells: string[]) =>
    '| ' + widths.map((_, i) => pad(cells[i] ?? '', i)).join(' | ') + ' |'
  const delimRow =
    '| ' +
    widths
      .map((w, i) => {
        const a = align[i]
        if (a === 'center') return ':' + '-'.repeat(w - 2) + ':'
        if (a === 'right') return '-'.repeat(w - 1) + ':'
        if (a === 'left') return ':' + '-'.repeat(w - 1)
        return '-'.repeat(w)
      })
      .join(' | ') +
    ' |'
  return [fmtRow(header), delimRow, ...rows.map(fmtRow)].join('\n')
}

export function formatTable(src: string): string {
  const parsed = parseTable(src)
  if (!parsed) return src
  return formatParsedTable(parsed)
}

const inlineMd = new MarkdownIt({ html: false, linkify: false })

function currentWidths(parsed: ParsedTable): number[] {
  return parsed.header.map((h, i) => Math.max(3, h.length, ...parsed.rows.map(r => (r[i] ?? '').length)))
}

function startResize(e: MouseEvent, col: number, view: EditorView, tableEl: HTMLTableElement): void {
  e.preventDefault()
  e.stopPropagation()
  const startX = e.clientX
  const table = findTableAt(view.state, view.posAtDOM(tableEl))
  if (!table) return
  const lineFrom = view.state.doc.lineAt(table.from)
  const lineTo = view.state.doc.lineAt(table.to)
  const parsed = parseTable(view.state.doc.sliceString(lineFrom.from, lineTo.to))
  if (!parsed) return
  const widths = currentWidths(parsed)

  const onMove = (_ev: MouseEvent) => { /* commit on release only */ }
  const onUp = (ev: MouseEvent) => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    const next = [...widths]
    next[col] = Math.max(1, widths[col] + Math.round(ev.clientX - startX))
    view.dispatch({
      changes: { from: lineFrom.from, to: lineTo.to, insert: formatParsedTable(parsed, next) },
      userEvent: 'format.table',
    })
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

export class TableWidget extends WidgetType {
  constructor(readonly src: string) { super() }
  eq(other: TableWidget) { return other.src === this.src }
  get estimatedHeight() {
    const lines = this.src.split('\n').filter(l => l.trim() !== '').length
    return Math.max(40, lines * 36)
  }

  toDOM(view: EditorView) {
    const container = document.createElement('div')
    container.className = 'cm-table-container'
    const table = document.createElement('table')
    table.className = 'cm-table-widget'
    const parsed = parseTable(this.src)
    if (parsed) {
      const alignStyle = (i: number) => parsed.align[i] ?? undefined
      const thead = table.createTHead()
      const hr = thead.insertRow()
      parsed.header.forEach((cell, i) => {
        const th = document.createElement('th')
        th.innerHTML = inlineMd.renderInline(cell)
        if (alignStyle(i)) th.style.textAlign = alignStyle(i)!
        const handle = document.createElement('span')
        handle.className = 'cm-table-resize'
        handle.addEventListener('mousedown', e => startResize(e, i, view, table))
        th.appendChild(handle)
        hr.appendChild(th)
      })
      const tbody = table.createTBody()
      for (const row of parsed.rows) {
        const tr = tbody.insertRow()
        row.forEach((cell, i) => {
          const td = tr.insertCell()
          td.innerHTML = inlineMd.renderInline(cell)
          if (alignStyle(i)) td.style.textAlign = alignStyle(i)!
        })
      }
    } else {
      table.textContent = this.src
    }
    container.appendChild(table)
    container.addEventListener('mousedown', e => {
      e.preventDefault()
      const pos = view.posAtDOM(container)
      view.dispatch({ selection: { anchor: pos } })
      view.focus()
    })
    return container
  }
  ignoreEvent() { return true }
}

export function findTableAt(state: EditorState, pos: number): SyntaxNode | null {
  const find = (p: number) => {
    for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(p, 1); n; n = n.parent) {
      if (n.name === 'Table') return n
    }
    return null
  }
  return find(pos) ?? (pos > 0 ? find(pos - 1) : null)
}

/**
 * When a lone cursor moves INTO a table (from outside), re-pad its pipes once.
 * The one sanctioned auto-edit of the document (see spec).
 */
export const tableAutoFormat: Extension = EditorView.updateListener.of(update => {
  if (update.docChanged || !update.selectionSet) return
  const state = update.state
  const sel = state.selection.main
  if (!sel.empty || state.selection.ranges.length > 1) return
  const table = findTableAt(state, sel.head)
  if (!table) return
  const wasInside = findTableAt(update.startState, update.startState.selection.main.head)
  if (wasInside) return
  const lineFrom = state.doc.lineAt(table.from)
  const lineTo = state.doc.lineAt(table.to)
  const src = state.doc.sliceString(lineFrom.from, lineTo.to)
  const formatted = formatTable(src)
  if (formatted === src) return
  const cursorLine = state.doc.lineAt(sel.head)
  const lineIndex = cursorLine.number - lineFrom.number
  const col = sel.head - cursorLine.from
  const newLines = formatted.split('\n')
  const before = newLines.slice(0, lineIndex).reduce((n, l) => n + l.length + 1, 0)
  const anchor = Math.min(
    lineFrom.from + before + Math.min(col, newLines[lineIndex]?.length ?? 0),
    lineFrom.from + formatted.length)
  update.view.dispatch({
    changes: { from: lineFrom.from, to: lineTo.to, insert: formatted },
    selection: { anchor },
    userEvent: 'format.table',
  })
})
