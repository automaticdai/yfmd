import type { EditorState } from '@codemirror/state'

/**
 * YAML frontmatter: a `---` fence on the very first line, closed by a later
 * `---` or `...` line. Without a closing fence there is no frontmatter — that
 * keeps a freshly typed `---` from swallowing the rest of the document.
 *
 * Markdown itself has no such construct, so lezer parses the block as a
 * horizontal rule plus lists and Setext headings. Rather than teach the parser
 * (a block parser cannot look ahead for the closing fence without consuming
 * lines it may need to give back), consumers scan for the range and skip the
 * nodes inside it.
 */
export interface FrontmatterRange {
  from: number
  /** End of the closing fence, trailing whitespace excluded. */
  to: number
}

const OPEN = /^---[ \t]*\r?$/
const CLOSE = /^(?:---|\.\.\.)[ \t]*\r?$/

/**
 * Locate the frontmatter block at the start of `text`.
 *
 * Callers working with a large document may pass a prefix: truncation can only
 * hide a closing fence, never invent one.
 */
export function findFrontmatter(text: string): FrontmatterRange | null {
  let eol = text.indexOf('\n')
  if (eol === -1) return null // an opening fence with no line after it closes nothing
  if (!OPEN.test(text.slice(0, eol))) return null

  for (let start = eol + 1; start <= text.length; start = eol + 1) {
    eol = text.indexOf('\n', start)
    const line = text.slice(start, eol === -1 ? text.length : eol)
    if (CLOSE.test(line)) return { from: 0, to: start + line.trimEnd().length }
    if (eol === -1) break
  }
  return null
}

/**
 * Frontmatter can only sit at the top, so scanning a prefix bounds the work a
 * keystroke does on a large document.
 */
const SCAN_LIMIT = 8192

export function frontmatterRange(state: EditorState): FrontmatterRange | null {
  return findFrontmatter(state.doc.sliceString(0, Math.min(state.doc.length, SCAN_LIMIT)))
}

/** True when a syntax node lies wholly within the frontmatter block. */
export function insideFrontmatter(range: FrontmatterRange | null, from: number, to: number): boolean {
  return range !== null && from >= range.from && to <= range.to
}

/** Drop the frontmatter block, and the line break after it, from a document. */
export function stripFrontmatter(text: string): string {
  const range = findFrontmatter(text)
  if (!range) return text
  let end = range.to
  while (end < text.length && text[end] !== '\n') end++ // trailing whitespace on the fence
  return text.slice(end + 1)
}
