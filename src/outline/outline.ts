import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { frontmatterRange, insideFrontmatter } from '../editor/frontmatter'

export interface OutlineItem { level: number; text: string; from: number }

/** Lowercase slug for heading anchors, keeping CJK/letters/numbers intact. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
}

const ATX = /^ATXHeading([1-6])$/
const SETEXT = /^SetextHeading([12])$/

/** Heading text with markdown syntax characters stripped for display. */
function cleanHeadingText(raw: string): string {
  return raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+#+\s*$/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label only
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractOutline(state: EditorState): OutlineItem[] {
  const items: OutlineItem[] = []
  const frontmatter = frontmatterRange(state)
  syntaxTree(state).iterate({
    enter(node): boolean | void {
      // a trailing '---' fence turns the last metadata line into a Setext heading
      if (insideFrontmatter(frontmatter, node.from, node.to)) return false
      const atx = ATX.exec(node.name)
      const setext = SETEXT.exec(node.name)
      if (atx || setext) {
        const level = Number((atx ?? setext)![1])
        const firstLine = state.doc.lineAt(node.from)
        items.push({ level, text: cleanHeadingText(firstLine.text), from: node.from })
        return false
      }
      if (node.name === 'FencedCode' || node.name === 'CodeBlock') return false
    },
  })
  return items
}
