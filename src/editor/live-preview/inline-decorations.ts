import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { frontmatterRange, insideFrontmatter } from '../frontmatter'
import { selectionTouches, selectionTouchesLine } from './cursor-context'
import { findMathRanges } from './math'

import { WidgetType } from '@codemirror/view'

export const ALERT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const
export type AlertKind = typeof ALERT_KINDS[number]

export const ALERT_LABELS: Record<AlertKind, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

export const ALERT_ICONS: Record<AlertKind, string> = {
  note: '<svg class="cm-alert-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>',
  tip: '<svg class="cm-alert-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.585-.733l-.22-.26C3.197 7.72 2.5 6.78 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.53-.697 2.47-1.332 3.235l-.22.26c-.183.218-.383.456-.585.733-.207.3-.33.565-.37.847a.75.75 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848l.214-.253c.56-.679.984-1.32.984-2.304 0-2.06-1.637-3.75-4-3.75ZM6 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1Zm1.5 3.25a.75.75 0 0 0 0 1.5h1a.75.75 0 0 0 0-1.5h-1Z"/></svg>',
  important: '<svg class="cm-alert-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h3a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h5.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm6.25 2.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm0 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>',
  warning: '<svg class="cm-alert-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>',
  caution: '<svg class="cm-alert-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>',
}

const ALERT_RE = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+|$)/i

class AlertTitleWidget extends WidgetType {
  constructor(readonly kind: AlertKind) { super() }
  eq(o: AlertTitleWidget) { return o.kind === this.kind }
  toDOM() {
    const span = document.createElement('span')
    span.className = `cm-alert-title cm-alert-title-${this.kind}`
    span.innerHTML = `${ALERT_ICONS[this.kind]}<span class="cm-alert-title-text">${ALERT_LABELS[this.kind]}</span>`
    return span
  }
  ignoreEvent() { return false }
}

const hide = Decoration.replace({})
const HEADING_LINE = [1, 2, 3, 4, 5, 6].map(n =>
  Decoration.line({ class: `cm-heading-line cm-heading-line-${n}` }))
const QUOTE_LINE = Decoration.line({ class: 'cm-quote-line' })
const ALERT_LINES: Record<AlertKind, Decoration> = {
  note: Decoration.line({ class: 'cm-quote-line cm-alert-line cm-alert-note' }),
  tip: Decoration.line({ class: 'cm-quote-line cm-alert-line cm-alert-tip' }),
  important: Decoration.line({ class: 'cm-quote-line cm-alert-line cm-alert-important' }),
  warning: Decoration.line({ class: 'cm-quote-line cm-alert-line cm-alert-warning' }),
  caution: Decoration.line({ class: 'cm-quote-line cm-alert-line cm-alert-caution' }),
}
const CODEBLOCK_LINE = Decoration.line({ class: 'cm-codeblock-line' })
const TABLE_LINE = Decoration.line({ class: 'cm-table-line' })
const FRONTMATTER_LINE = Decoration.line({ class: 'cm-frontmatter-line' })
const FRONTMATTER_FIRST = Decoration.line({ class: 'cm-frontmatter-line cm-frontmatter-first' })
const FRONTMATTER_LAST = Decoration.line({ class: 'cm-frontmatter-line cm-frontmatter-last' })
const DIM = Decoration.mark({ class: 'cm-syntax-dim' })
const INLINE_CODE = Decoration.mark({ class: 'cm-inline-code' })
const LINK_TEXT = Decoration.mark({ class: 'cm-link-text' })

const INLINE_PARENTS = new Set(['Emphasis', 'StrongEmphasis', 'Strikethrough'])

export function buildInlineDecorations(state: EditorState): { hides: DecorationSet; lines: DecorationSet } {
  const hides: Range<Decoration>[] = []
  const lines: Range<Decoration>[] = []
  const doc = state.doc
  const frontmatter = frontmatterRange(state)
  const mathRanges = findMathRanges(state)
  const insideMath = (from: number, to: number) =>
    mathRanges.some(m => from >= m.from && to <= m.to)

  const eachLine = (from: number, to: number, deco: Decoration) => {
    const first = doc.lineAt(from).number
    const last = doc.lineAt(to).number
    for (let n = first; n <= last; n++) lines.push(deco.range(doc.line(n).from))
  }
  const hideWithSpace = (from: number, to: number) => {
    const space = doc.sliceString(to, to + 1) === ' ' ? 1 : 0
    hides.push(hide.range(from, to + space))
  }

  syntaxTree(state).iterate({
    enter(node): boolean | void {
      // frontmatter is styled as one block; the markdown nodes lezer sees inside
      // it (rules, lists, Setext headings) are artefacts
      if (insideFrontmatter(frontmatter, node.from, node.to)) return false
      if (insideMath(node.from, node.to)) return false
      const name = node.name
      if (name.startsWith('ATXHeading')) {
        lines.push(HEADING_LINE[Number(name.slice(-1)) - 1].range(doc.lineAt(node.from).from))
        return
      }
      if (name === 'SetextHeading1' || name === 'SetextHeading2') {
        lines.push(HEADING_LINE[name === 'SetextHeading1' ? 0 : 1].range(doc.lineAt(node.from).from))
        return
      }
      switch (name) {
        case 'HeaderMark': {
          const parent = node.node.parent
          if (!parent) return
          if (parent.name.startsWith('ATXHeading')) {
            // hide the leading '# ' (the parent's first child), never a trailing closing sequence
            const leading = parent.firstChild
            if (leading && node.from === leading.from && !selectionTouchesLine(state, node.from)) {
              hideWithSpace(node.from, node.to)
            }
          } else {
            hides.push(DIM.range(node.from, node.to)) // setext underline stays visible
          }
          return
        }
        case 'Blockquote': {
          const firstLine = doc.lineAt(node.from)
          const firstLineText = firstLine.text
          const quoteContent = firstLineText.replace(/^>\s*/, '')
          const alertMatch = ALERT_RE.exec(quoteContent)
          if (alertMatch) {
            const kind = alertMatch[1].toLowerCase() as AlertKind
            eachLine(node.from, node.to, ALERT_LINES[kind])
            const tagPosInLine = firstLineText.indexOf(alertMatch[0].trim())
            if (tagPosInLine !== -1) {
              const tagFrom = firstLine.from + tagPosInLine
              const tagTo = tagFrom + alertMatch[0].trim().length
              if (!selectionTouchesLine(state, firstLine.from)) {
                hides.push(Decoration.replace({ widget: new AlertTitleWidget(kind) }).range(tagFrom, tagTo))
              }
            }
          } else {
            eachLine(node.from, node.to, QUOTE_LINE)
          }
          return
        }
        case 'QuoteMark':
          if (!selectionTouchesLine(state, node.from)) hideWithSpace(node.from, node.to)
          return
        case 'EmphasisMark':
        case 'StrikethroughMark': {
          const parent = node.node.parent
          if (parent && INLINE_PARENTS.has(parent.name) && !selectionTouches(state, parent.from, parent.to)) {
            hides.push(hide.range(node.from, node.to))
          }
          return
        }
        case 'InlineCode':
          hides.push(INLINE_CODE.range(node.from, node.to))
          return
        case 'CodeMark': {
          const parent = node.node.parent
          if (parent?.name === 'InlineCode') {
            if (!selectionTouches(state, parent.from, parent.to)) hides.push(hide.range(node.from, node.to))
          } else {
            hides.push(DIM.range(node.from, node.to))
          }
          return
        }
        case 'CodeInfo':
          hides.push(DIM.range(node.from, node.to))
          return
        case 'FencedCode':
          eachLine(node.from, node.to, CODEBLOCK_LINE)
          return
        case 'Link': {
          const text = state.sliceDoc(node.from, node.to)
          if (/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i.test(text)) {
            return false
          }
          if (!selectionTouches(state, node.from, node.to)) {
            for (let child = node.node.firstChild; child; child = child.nextSibling) {
              if (child.name === 'LinkMark' || child.name === 'URL' || child.name === 'LinkTitle') {
                hides.push(hide.range(child.from, child.to))
              }
            }
          }
          hides.push(LINK_TEXT.range(node.from, node.to))
          return
        }
        case 'Table':
          if (selectionTouches(state, node.from, node.to)) {
            eachLine(node.from, node.to, TABLE_LINE)
          }
          return false
        case 'Image':
          return false
      }
    },
  })

  if (frontmatter) {
    const first = doc.lineAt(frontmatter.from).number
    const last = doc.lineAt(frontmatter.to).number
    for (let n = first; n <= last; n++) {
      const deco = n === first ? FRONTMATTER_FIRST : n === last ? FRONTMATTER_LAST : FRONTMATTER_LINE
      lines.push(deco.range(doc.line(n).from))
    }
  }

  return { hides: Decoration.set(hides, true), lines: Decoration.set(lines, true) }
}

export const inlineDecorations = ViewPlugin.fromClass(
  class {
    hides: DecorationSet
    lines: DecorationSet
    constructor(view: EditorView) {
      const b = buildInlineDecorations(view.state)
      this.hides = b.hides
      this.lines = b.lines
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet) {
        const b = buildInlineDecorations(u.state)
        this.hides = b.hides
        this.lines = b.lines
      }
    }
  },
  {
    provide: p => [
      EditorView.decorations.of(v => v.plugin(p)?.lines ?? Decoration.none),
      EditorView.decorations.of(v => v.plugin(p)?.hides ?? Decoration.none),
    ],
  },
)
