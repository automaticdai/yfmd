import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { scanFootnotes } from './footnote-scan'
import { findMathRanges, type MathRange } from './math'

export type ExtKind = 'mark' | 'sup' | 'sub' | 'emoji'
export interface ExtMatch { from: number; to: number; innerFrom: number; innerTo: number; kind: ExtKind }

export const EMOJI: Record<string, string> = {
  smile: '😄', grin: '😁', joy: '😂', wink: '😉', heart: '❤️', smiley: '😃',
  thumbsup: '👍', thumbsdown: '👎', clap: '👏', fire: '🔥', star: '⭐', ok_hand: '👌',
  warning: '⚠️', check: '✅', x: '❌', tada: '🎉', rocket: '🚀', pray: '🙏', eyes: '👀',
}

/** Code-block and table ranges where extension syntax must be ignored. */
export function findExcludedRanges(state: EditorState, mathRanges: MathRange[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  syntaxTree(state).iterate({
    enter(node): boolean | void {
      if (
        node.name === 'FencedCode' ||
        node.name === 'CodeBlock' ||
        node.name === 'InlineCode' ||
        node.name === 'Table'
      ) {
        ranges.push([node.from, node.to])
        return false
      }
    },
  })
  for (const m of mathRanges) {
    ranges.push([m.from, m.to])
  }
  return ranges
}

/**
 * Everything the extension scan must not see: the code/math exclusions above, plus
 * footnote markers — their `^` would otherwise pair with the next caret on the line,
 * turning `claim[^a] with x^2^` into one bogus superscript.
 */
export function findScanExclusions(state: EditorState, mathRanges: MathRange[]): Array<[number, number]> {
  const ranges = findExcludedRanges(state, mathRanges)
  const { refs, defs } = scanFootnotes(state.doc.toString(), ranges)
  for (const r of refs) ranges.push([r.from, r.to])
  for (const d of defs) ranges.push([d.from, d.markerTo])
  return ranges
}

/**
 * Blank out excluded characters, preserving every offset. Scanning the masked copy stops a
 * delimiter inside an excluded range from pairing with a real one outside it, and leaves the
 * following real match available — rejecting the match after the fact would consume it.
 */
const MASK = '\u0000'

function maskExcluded(sub: string, base: number, excluded: Array<[number, number]>): string {
  if (excluded.length === 0) return sub
  const chars = [...sub]
  for (const [f, t] of excluded) {
    const from = Math.max(0, f - base)
    const to = Math.min(chars.length, t - base)
    for (let i = from; i < to; i++) chars[i] = MASK
  }
  return chars.join('')
}

/** Scan `sub` (which starts at absolute position `base`) for extension matches. */
export function scanExtensionsIn(sub: string, base: number, excluded: Array<[number, number]>): ExtMatch[] {
  const text = maskExcluded(sub, base, excluded)
  const out: ExtMatch[] = []

  for (const m of text.matchAll(/==([^=\n]+)==/g)) {
    if (m[0].includes(MASK)) continue
    const from = base + m.index!
    out.push({ from, to: from + m[0].length, innerFrom: from + 2, innerTo: from + 2 + m[1].length, kind: 'mark' })
  }
  for (const m of text.matchAll(/\^([^\s^][^\^\n]*)\^(?!\^)/g)) {
    if (m[0].includes(MASK)) continue
    const from = base + m.index!
    out.push({ from, to: from + m[0].length, innerFrom: from + 1, innerTo: from + 1 + m[1].length, kind: 'sup' })
  }
  for (const m of text.matchAll(/~([^\s~][^~\n]*)~(?!~)/g)) {
    if (m[0].includes(MASK)) continue
    const from = base + m.index!
    out.push({ from, to: from + m[0].length, innerFrom: from + 1, innerTo: from + 1 + m[1].length, kind: 'sub' })
  }
  for (const m of text.matchAll(/:([a-zA-Z0-9_+-]+):/g)) {
    if (m[0].includes(MASK) || !EMOJI[m[1]]) continue
    const from = base + m.index!
    out.push({ from, to: from + m[0].length, innerFrom: from + 1, innerTo: from + 1 + m[1].length, kind: 'emoji' })
  }

  // Matches are gathered one kind at a time, so the array isn't in document
  // order; RangeSetBuilder (the sole consumer) requires ascending `from`.
  out.sort((a, b) => a.from - b.from)
  return out
}

/** Full-document extension scan (pure — used for the initial state and fallback). */
export function findExtensions(state: EditorState): ExtMatch[] {
  const mathRanges = findMathRanges(state)
  return scanExtensionsIn(state.doc.toString(), 0, findScanExclusions(state, mathRanges))
}
