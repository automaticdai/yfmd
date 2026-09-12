import type { EditorState, Range } from '@codemirror/state'
import { StateField } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { parseAdvanced } from './analysis'
import { selectionTouches } from './cursor-context'
import { findExcludedRanges } from './extensions'
import { rebuildWidgets, syntaxOptions } from './facets'
import { scanFootnotes } from './footnote-scan'
import { findMathRanges } from './math'

class FootnoteNumWidget extends WidgetType {
  constructor(readonly num: number, readonly cls: string) { super() }
  eq(o: FootnoteNumWidget) { return o.num === this.num && o.cls === this.cls }
  toDOM() {
    const sup = document.createElement('sup')
    sup.className = this.cls
    sup.textContent = String(this.num)
    return sup
  }
  ignoreEvent() { return true }
}

/** A decoration that gives way to its raw source when the cursor touches the guard range. */
interface Revealable { deco: Range<Decoration>; guardFrom: number; guardTo: number }

const DEF_LINE = Decoration.line({ class: 'cm-footnote-def' })

interface Structure { revealable: Revealable[]; lines: Range<Decoration>[] }

function build(state: EditorState): Structure {
  if (!state.facet(syntaxOptions).references) return { revealable: [], lines: [] }
  const excluded = findExcludedRanges(state, findMathRanges(state))
  const { refs, defs } = scanFootnotes(state.doc.toString(), excluded)
  const out: Revealable[] = []
  const lines: Range<Decoration>[] = []
  for (const r of refs) {
    out.push({
      deco: Decoration.replace({ widget: new FootnoteNumWidget(r.num, 'cm-footnote-ref') }).range(r.from, r.to),
      guardFrom: r.from,
      guardTo: r.to,
    })
  }
  for (const d of defs) {
    // The line styling is unconditional — a definition stays part of the reference
    // list even while the cursor is editing it.
    lines.push(DEF_LINE.range(d.from))
    // Guarded by the whole line: editing the note text should show its marker too.
    out.push({
      deco: Decoration.replace({ widget: new FootnoteNumWidget(d.num, 'cm-footnote-def-num') }).range(d.from, d.markerTo),
      guardFrom: d.from,
      guardTo: d.to,
    })
  }
  out.sort((a, b) => a.deco.from - b.deco.from)
  return { revealable: out, lines }
}

function select(structure: Structure, state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [...structure.lines]
  for (const r of structure.revealable) {
    if (!selectionTouches(state, r.guardFrom, r.guardTo)) ranges.push(r.deco)
  }
  return Decoration.set(ranges, true)
}

interface FieldValue { structure: Structure; decorations: DecorationSet }

/** Renders `[^id]` markers and `[^id]: text` definitions as numbered references. */
export const footnotesField = StateField.define<FieldValue>({
  create: state => {
    const structure = build(state)
    return { structure, decorations: select(structure, state) }
  },
  update(value, tr) {
    if (
      tr.docChanged ||
      parseAdvanced(tr.startState, tr.state) ||
      tr.startState.facet(syntaxOptions) !== tr.state.facet(syntaxOptions) ||
      tr.effects.some(e => e.is(rebuildWidgets))
    ) {
      const structure = build(tr.state)
      return { structure, decorations: select(structure, tr.state) }
    }
    if (!tr.startState.selection.eq(tr.state.selection)) {
      return { structure: value.structure, decorations: select(value.structure, tr.state) }
    }
    return value
  },
  provide: f => EditorView.decorations.from(f, v => v.decorations),
})
