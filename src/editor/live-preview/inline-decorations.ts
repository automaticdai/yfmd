import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { selectionTouches, selectionTouchesLine } from './cursor-context'

const hide = Decoration.replace({})
const HEADING_LINE = [1, 2, 3, 4, 5, 6].map(n =>
  Decoration.line({ class: `cm-heading-line cm-heading-line-${n}` }))
const QUOTE_LINE = Decoration.line({ class: 'cm-quote-line' })
const CODEBLOCK_LINE = Decoration.line({ class: 'cm-codeblock-line' })
const TABLE_LINE = Decoration.line({ class: 'cm-table-line' })
const DIM = Decoration.mark({ class: 'cm-syntax-dim' })
const INLINE_CODE = Decoration.mark({ class: 'cm-inline-code' })
const LINK_TEXT = Decoration.mark({ class: 'cm-link-text' })

const INLINE_PARENTS = new Set(['Emphasis', 'StrongEmphasis', 'Strikethrough'])

export function buildInlineDecorations(state: EditorState): { hides: DecorationSet; lines: DecorationSet } {
  const hides: Range<Decoration>[] = []
  const lines: Range<Decoration>[] = []
  const doc = state.doc

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
            // leading mark only; a heading line's mark starts at the line start
            if (node.from === doc.lineAt(node.from).from && !selectionTouchesLine(state, node.from)) {
              hideWithSpace(node.from, node.to)
            }
          } else {
            hides.push(DIM.range(node.from, node.to)) // setext underline stays visible
          }
          return
        }
        case 'Blockquote':
          eachLine(node.from, node.to, QUOTE_LINE)
          return
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
          eachLine(node.from, node.to, TABLE_LINE)
          return false
        case 'Image':
          return false
      }
    },
  })
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
