import { EditorSelection, type EditorState, type Line, type TransactionSpec } from '@codemirror/state'
import type { Command } from '@codemirror/view'

const ATX_RE = /^(#{1,6})[ \t]+/
const QUOTE_RE = /^>[ \t]?/
const UL_RE = /^[-*+][ \t]/
const OL_RE = /^\d+\.[ \t]/

/** Lines touched by the main selection, skipping blank ones (falls back to the cursor's own line). */
function touchedLines(state: EditorState): Line[] {
  const sel = state.selection.main
  const first = state.doc.lineAt(sel.from).number
  const last = state.doc.lineAt(sel.to).number
  const lines: Line[] = []
  for (let n = first; n <= last; n++) {
    const line = state.doc.line(n)
    if (line.text.trim() !== '') lines.push(line)
  }
  return lines.length > 0 ? lines : [state.doc.lineAt(sel.from)]
}

/**
 * Set (or clear, toggling off if already at that level) the ATX heading
 * level of the cursor's line. level 0 = plain paragraph.
 */
export function setHeadingChanges(state: EditorState, level: 0 | 1 | 2 | 3 | 4 | 5 | 6): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.head)
  const match = ATX_RE.exec(line.text)
  const currentLevel = match ? match[1].length : 0
  const rest = match ? line.text.slice(match[0].length) : line.text
  const targetLevel = currentLevel === level ? 0 : level
  const newText = targetLevel === 0 ? rest : '#'.repeat(targetLevel) + ' ' + rest
  const delta = newText.length - line.text.length
  const head = Math.min(Math.max(line.from, state.selection.main.head + delta), line.from + newText.length)
  return {
    changes: { from: line.from, to: line.to, insert: newText },
    selection: EditorSelection.cursor(head),
    userEvent: 'input',
    scrollIntoView: true,
  }
}

export function headingCommand(level: 0 | 1 | 2 | 3 | 4 | 5 | 6): Command {
  return view => {
    view.dispatch(view.state.update(setHeadingChanges(view.state, level)))
    return true
  }
}

/** Toggle a `> ` blockquote prefix on every non-blank line the selection touches. */
export function toggleQuoteChanges(state: EditorState): TransactionSpec {
  const lines = touchedLines(state)
  const allQuoted = lines.every(l => QUOTE_RE.test(l.text))
  const changes = lines.map(l => {
    if (allQuoted) {
      const m = QUOTE_RE.exec(l.text)!
      return { from: l.from, to: l.from + m[0].length, insert: '' }
    }
    return { from: l.from, insert: '> ' }
  })
  return { changes, userEvent: 'input', scrollIntoView: true }
}

export const toggleQuote: Command = view => {
  view.dispatch(view.state.update(toggleQuoteChanges(view.state)))
  return true
}

/** Toggle a list marker on every non-blank line the selection touches. */
export function toggleListChanges(state: EditorState, kind: 'unordered' | 'ordered'): TransactionSpec {
  const lines = touchedLines(state)
  const re = kind === 'unordered' ? UL_RE : OL_RE
  const allListed = lines.every(l => re.test(l.text))
  const changes = lines.map((l, i) => {
    if (allListed) {
      const m = re.exec(l.text)!
      return { from: l.from, to: l.from + m[0].length, insert: '' }
    }
    return { from: l.from, insert: kind === 'unordered' ? '- ' : `${i + 1}. ` }
  })
  return { changes, userEvent: 'input', scrollIntoView: true }
}

export function listCommand(kind: 'unordered' | 'ordered'): Command {
  return view => {
    view.dispatch(view.state.update(toggleListChanges(view.state, kind)))
    return true
  }
}

/**
 * Insert a block snippet after the cursor's line, padding with blank lines
 * only where the surrounding lines aren't already blank. [selStart, selEnd)
 * is selected within the inserted snippet (a single cursor when equal).
 */
export function insertBlockChanges(
  state: EditorState, snippet: string, selStart: number, selEnd = selStart,
): TransactionSpec {
  const line = state.doc.lineAt(state.selection.main.head)
  const isBlank = line.text === ''
  const nextLine = line.number < state.doc.lines ? state.doc.line(line.number + 1) : null

  let insertPos: number
  let leading: string
  if (isBlank && line.number === 1) {
    // top of an empty (or blank-first-line) document: nothing to separate from
    insertPos = line.to
    leading = ''
  } else if (isBlank && nextLine) {
    // an existing blank line already separates us from what's above; insert
    // past its own terminating newline so that gap isn't duplicated
    insertPos = nextLine.from
    leading = ''
  } else if (isBlank) {
    insertPos = line.to
    leading = '\n'
  } else {
    insertPos = line.to
    leading = '\n\n'
  }
  const base = insertPos + leading.length
  return {
    changes: { from: insertPos, insert: leading + snippet + '\n\n' },
    selection: EditorSelection.range(base + selStart, base + selEnd),
    userEvent: 'input',
    scrollIntoView: true,
  }
}

function insertBlockCommand(snippet: string, selStart: number, selEnd = selStart): Command {
  return view => {
    view.dispatch(view.state.update(insertBlockChanges(view.state, snippet, selStart, selEnd)))
    return true
  }
}

/**
 * Create a markdown table snippet with `rows` data rows and `cols` columns.
 * E.g. rows = 3, cols = 3 creates:
 * | Header 1 | Header 2 | Header 3 |
 * | -------- | -------- | -------- |
 * | Cell     | Cell     | Cell     |
 * | Cell     | Cell     | Cell     |
 * | Cell     | Cell     | Cell     |
 */
export function createTableSnippet(rows: number, cols: number): { snippet: string; selStart: number; selEnd: number } {
  const c = Math.max(1, cols)
  const r = Math.max(1, rows)
  const headers = Array.from({ length: c }, (_, i) => `Header ${i + 1}`)
  const delims = Array.from({ length: c }, () => '--------')
  const headerLine = `| ${headers.join(' | ')} |`
  const delimLine = `| ${delims.join(' | ')} |`
  const bodyLines = Array.from({ length: r }, () => `| ${Array.from({ length: c }, () => 'Cell').join('     | ')}     |`)
  const snippet = [headerLine, delimLine, ...bodyLines].join('\n')
  return { snippet, selStart: 2, selEnd: 2 + headers[0].length }
}

export function insertCustomTable(rows: number, cols: number): Command {
  const { snippet, selStart, selEnd } = createTableSnippet(rows, cols)
  return insertBlockCommand(snippet, selStart, selEnd)
}

export const insertTable = insertCustomTable(1, 2)
export const insertCodeBlock = insertBlockCommand('```\n\n```', 4)
export const insertMathBlock = insertBlockCommand('$$\n\n$$', 3)
export const insertHorizontalRule = insertBlockCommand('---', 3)
export const insertAlert = (kind: 'note' | 'tip' | 'important' | 'warning' | 'caution'): Command => {
  const upper = kind.toUpperCase()
  const snippet = `> [!${upper}]\n> `
  return insertBlockCommand(snippet, snippet.length)
}

