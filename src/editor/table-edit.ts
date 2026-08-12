import type { EditorState, TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import { findTableAt, formatParsedTable, parseTable, type ParsedTable } from './live-preview/table'

function pipePositions(text: string): number[] {
  const positions: number[] = []
  let escaped = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '|') positions.push(i)
  }
  return positions
}

/** Absolute doc offsets of each editable cell's content start (delimiter row excluded). */
function tableCellStarts(state: EditorState, table: SyntaxNode): number[] {
  const first = state.doc.lineAt(table.from).number
  const last = state.doc.lineAt(table.to).number
  const starts: number[] = []
  for (let n = first; n <= last; n++) {
    if (n === first + 1) continue
    const line = state.doc.line(n)
    const pipes = pipePositions(line.text)
    for (let i = 0; i + 1 < pipes.length; i++) {
      let j = pipes[i] + 1
      while (j < line.text.length && line.text[j] === ' ') j++
      starts.push(line.from + j)
    }
  }
  return starts
}

/** Row index: 0 = header, 1.. = data rows (delimiter line maps to 0). */
function rowIndexOf(state: EditorState, table: SyntaxNode, head: number): number {
  const lineIndex = state.doc.lineAt(head).number - state.doc.lineAt(table.from).number
  return lineIndex <= 1 ? 0 : lineIndex - 1
}

function columnIndexOf(state: EditorState, head: number): number {
  const line = state.doc.lineAt(head)
  const pipes = pipePositions(line.text)
  let count = 0
  for (const p of pipes) if (p < head - line.from) count++
  return Math.max(0, count - 1)
}

function tableAt(state: EditorState, head: number): { table: SyntaxNode; parsed: ParsedTable } | null {
  const table = findTableAt(state, head)
  if (!table) return null
  const lineFrom = state.doc.lineAt(table.from)
  const lineTo = state.doc.lineAt(table.to)
  const parsed = parseTable(state.doc.sliceString(lineFrom.from, lineTo.to))
  if (!parsed) return null
  return { table, parsed }
}

/** Replace the whole table with the reformatted result, cursor at (targetRow, targetCol). */
function replaceTable(state: EditorState, table: SyntaxNode, parsed: ParsedTable, targetRow: number, targetCol: number): TransactionSpec {
  const lineFrom = state.doc.lineAt(table.from)
  const lineTo = state.doc.lineAt(table.to)
  const formatted = formatParsedTable(parsed)
  const lines = formatted.split('\n')
  const lineIndex = targetRow === 0 ? 0 : targetRow + 1
  const line = lines[Math.min(lineIndex, lines.length - 1)] ?? ''
  const pipes = pipePositions(line)
  const pipeIdx = Math.min(targetCol, Math.max(0, pipes.length - 2))
  let j = (pipes[pipeIdx] ?? 0) + 1
  while (j < line.length && line[j] === ' ') j++
  let offset = 0
  for (let i = 0; i < lineIndex && i < lines.length; i++) offset += lines[i].length + 1
  const anchor = Math.min(lineFrom.from + offset + j, lineFrom.from + formatted.length)
  return { changes: { from: lineFrom.from, to: lineTo.to, insert: formatted }, selection: { anchor }, userEvent: 'format.table' }
}

/** Move the cursor to the next (dir=1) or previous (dir=-1) editable cell. */
export function tableNavSpec(state: EditorState, dir: 1 | -1): TransactionSpec | null {
  const head = state.selection.main.head
  const table = findTableAt(state, head)
  if (!table) return null
  const starts = tableCellStarts(state, table)
  if (starts.length === 0) return null
  let idx = starts.findIndex(p => p > head)
  idx = idx === -1 ? starts.length - 1 : idx - 1
  if (idx < 0) idx = 0
  const target = starts[idx + dir]
  if (target === undefined || target === head) return null
  return { selection: { anchor: target } }
}

export function tableTab(view: EditorView, dir: 1 | -1): boolean {
  const inTable = findTableAt(view.state, view.state.selection.main.head) !== null
  if (!inTable) return false
  const spec = tableNavSpec(view.state, dir)
  if (spec) view.dispatch(view.state.update(spec))
  return true
}

/** Enter at the very end of the table adds a new row. */
export function tableEnterSpec(state: EditorState): TransactionSpec | null {
  const head = state.selection.main.head
  const table = findTableAt(state, head)
  if (!table) return null
  if (head !== state.doc.lineAt(table.to).to) return null
  return addTableRowSpec(state)
}

export function tableEnter(view: EditorView): boolean {
  const spec = tableEnterSpec(view.state)
  if (!spec) return false
  view.dispatch(view.state.update(spec))
  return true
}

export function addTableRowSpec(state: EditorState): TransactionSpec | null {
  const head = state.selection.main.head
  const found = tableAt(state, head)
  if (!found) return null
  const row = rowIndexOf(state, found.table, head)
  found.parsed.rows.splice(row, 0, Array(found.parsed.header.length).fill(''))
  return replaceTable(state, found.table, found.parsed, row + 1, 0)
}

export function removeTableRowSpec(state: EditorState): TransactionSpec | null {
  const head = state.selection.main.head
  const found = tableAt(state, head)
  if (!found) return null
  const row = rowIndexOf(state, found.table, head)
  if (row === 0 || found.parsed.rows.length === 0) return null
  found.parsed.rows.splice(row - 1, 1)
  return replaceTable(state, found.table, found.parsed, Math.min(row, found.parsed.rows.length), 0)
}

export function addTableColSpec(state: EditorState): TransactionSpec | null {
  const head = state.selection.main.head
  const found = tableAt(state, head)
  if (!found) return null
  const row = rowIndexOf(state, found.table, head)
  found.parsed.header.push('')
  for (const r of found.parsed.rows) r.push('')
  found.parsed.align.push(null)
  return replaceTable(state, found.table, found.parsed, row, found.parsed.header.length - 1)
}

export function removeTableColSpec(state: EditorState): TransactionSpec | null {
  const head = state.selection.main.head
  const found = tableAt(state, head)
  if (!found) return null
  const col = columnIndexOf(state, head)
  const ncol = found.parsed.header.length
  if (ncol <= 1 || col >= ncol) return null
  found.parsed.header.splice(col, 1)
  for (const r of found.parsed.rows) r.splice(col, 1)
  found.parsed.align.splice(col, 1)
  const row = rowIndexOf(state, found.table, head)
  return replaceTable(state, found.table, found.parsed, row, Math.min(col, ncol - 2))
}

function command(specFn: (state: EditorState) => TransactionSpec | null) {
  return (view: EditorView): boolean => {
    const spec = specFn(view.state)
    if (!spec) return false
    view.dispatch(view.state.update(spec))
    view.focus()
    return true
  }
}

export const addTableRow = command(addTableRowSpec)
export const removeTableRow = command(removeTableRowSpec)
export const addTableColumn = command(addTableColSpec)
export const removeTableColumn = command(removeTableColSpec)
