import { EditorSelection, type EditorState, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { extractOutline, slugify, type OutlineItem } from '../outline/outline'

export function buildTocMarkdown(items: OutlineItem[]): string {
  return items
    .map(item => `${'  '.repeat(item.level - 1)}- [${item.text}](#${slugify(item.text)})`)
    .join('\n')
}

/** Pure change computation to insert a table of contents at the cursor. */
export function insertTocSpec(state: EditorState): TransactionSpec | null {
  const items = extractOutline(state)
  if (items.length === 0) return null
  const toc = buildTocMarkdown(items) + '\n'
  const changes = state.changeByRange(range => ({
    changes: { from: range.from, to: range.to, insert: toc },
    range: EditorSelection.cursor(range.from + toc.length),
  }))
  return { ...changes, userEvent: 'input', scrollIntoView: true }
}

export function insertToc(view: EditorView): void {
  const spec = insertTocSpec(view.state)
  if (spec) view.dispatch(view.state.update(spec))
  view.focus()
}
