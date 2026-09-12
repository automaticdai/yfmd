import { syntaxTree } from '@codemirror/language'
import type { EditorState, Transaction } from '@codemirror/state'
import { StateField } from '@codemirror/state'
import { findExtensions, findScanExclusions, scanExtensionsIn, type ExtMatch } from './extensions'
import { findMathRanges, type MathRange } from './math'

/**
 * True when the language parser advanced between two states. A large document
 * parses only its first viewport synchronously; the rest of the syntax tree is
 * filled in by async transactions that carry no `docChanged`, so tree-derived
 * decorations must also rebuild when the tree identity changes.
 */
export function parseAdvanced(startState: EditorState, state: EditorState): boolean {
  return syntaxTree(startState) !== syntaxTree(state)
}

/** Per-document analysis computed once per doc change and shared by the decoration providers. */
export interface DocAnalysis {
  mathRanges: MathRange[]
  extensions: ExtMatch[]
}

/**
 * Memoizes the two expensive full-document scans (math `$` ranges and extension
 * syntax `==`/`^`/`~`/`:emoji:`) so they run once per edit instead of once per
 * consumer. Math recomputes on every doc change; extensions update incrementally.
 */
export const docAnalysisField = StateField.define<DocAnalysis>({
  create: state => ({ mathRanges: findMathRanges(state), extensions: findExtensions(state) }),
  update(analysis, tr) {
    if (tr.docChanged) {
      const mathRanges = findMathRanges(tr.state)
      return { mathRanges, extensions: updateExtensions(analysis.extensions, tr, mathRanges) }
    }
    // Parser caught up on a later part of the document: re-scan so code fences
    // and tables that only now exist in the tree exclude extension syntax.
    if (parseAdvanced(tr.startState, tr.state)) {
      return { mathRanges: analysis.mathRanges, extensions: findExtensions(tr.state) }
    }
    return analysis
  },
})

/** Cached math ranges, falling back to a direct scan when the field isn't configured. */
export function getMathRanges(state: EditorState): MathRange[] {
  return state.field(docAnalysisField, false)?.mathRanges ?? findMathRanges(state)
}

/** Cached extension matches, falling back to a direct scan when the field isn't configured. */
export function getExtensions(state: EditorState): ExtMatch[] {
  return state.field(docAnalysisField, false)?.extensions ?? findExtensions(state)
}

/** Characters that can open/close code fences, inline code, or math blocks — they make the
 * excluded ranges change non-locally, so the incremental scan must fall back to a full pass. */
const STRUCTURAL = /[`$~]/

/**
 * Incrementally update extension matches after a document change: matches outside the
 * affected lines are remapped, the affected lines are re-scanned. Falls back to a full
 * rescan when the edit touches structural delimiters (```, `, $, ~~~) whose effect on
 * code/math exclusion is document-global.
 */
export function updateExtensions(prev: ExtMatch[], tr: Transaction, mathRanges: MathRange[]): ExtMatch[] {
  let structural = false
  let aFrom = Infinity
  let aTo = -Infinity
  tr.changes.iterChangedRanges((fA, tA, fB, tB) => {
    if (!structural) {
      structural = STRUCTURAL.test(tr.startState.doc.sliceString(fA, tA)) ||
        STRUCTURAL.test(tr.state.doc.sliceString(fB, tB))
    }
    aFrom = Math.min(aFrom, fA); aTo = Math.max(aTo, tA)
  })

  if (structural) return findExtensions(tr.state)

  const oldDoc = tr.startState.doc
  const oldFrom = oldDoc.lineAt(aFrom).from
  const oldTo = oldDoc.lineAt(Math.max(aFrom, aTo - 1)).to
  const newDoc = tr.state.doc
  // The new affected region is the image of the old affected lines under the change —
  // mapping the old boundaries (not the raw inserted range) so lines shifted by
  // newline insertion are still re-scanned.
  const newFrom = newDoc.lineAt(tr.changes.mapPos(oldFrom, 1)).from
  const newTo = newDoc.lineAt(tr.changes.mapPos(oldTo, -1)).to

  const out: ExtMatch[] = []
  for (const m of prev) {
    // Matches are single-line, so a match overlapping the changed line range must be re-scanned.
    if (m.to >= oldFrom && m.from <= oldTo) continue
    out.push({
      ...m,
      from: tr.changes.mapPos(m.from, 1),
      to: tr.changes.mapPos(m.to, -1),
      innerFrom: tr.changes.mapPos(m.innerFrom, 1),
      innerTo: tr.changes.mapPos(m.innerTo, -1),
    })
  }

  if (newTo > newFrom) {
    const sub = newDoc.sliceString(newFrom, newTo)
    const excluded = findScanExclusions(tr.state, mathRanges)
    out.push(...scanExtensionsIn(sub, newFrom, excluded))
  }

  out.sort((a, b) => a.from - b.from)
  return out
}
