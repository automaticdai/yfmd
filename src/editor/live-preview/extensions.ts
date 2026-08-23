import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
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

/** Scan `sub` (which starts at absolute position `base`) for extension matches. */
export function scanExtensionsIn(sub: string, base: number, excluded: Array<[number, number]>): ExtMatch[] {
  const inExcluded = (pos: number) => excluded.some(([f, t]) => pos >= f && pos < t)
  const out: ExtMatch[] = []

  for (const m of sub.matchAll(/==([^=\n]+)==/g)) {
    const from = base + m.index!
    if (inExcluded(from)) continue
    out.push({ from, to: from + m[0].length, innerFrom: from + 2, innerTo: from + 2 + m[1].length, kind: 'mark' })
  }
  for (const m of sub.matchAll(/\^([^\s^][^\^\n]*)\^(?!\^)/g)) {
    const from = base + m.index!
    if (inExcluded(from)) continue
    out.push({ from, to: from + m[0].length, innerFrom: from + 1, innerTo: from + 1 + m[1].length, kind: 'sup' })
  }
  for (const m of sub.matchAll(/~([^\s~][^~\n]*)~(?!~)/g)) {
    const from = base + m.index!
    if (inExcluded(from)) continue
    out.push({ from, to: from + m[0].length, innerFrom: from + 1, innerTo: from + 1 + m[1].length, kind: 'sub' })
  }
  for (const m of sub.matchAll(/:([a-zA-Z0-9_+-]+):/g)) {
    const from = base + m.index!
    if (!EMOJI[m[1]] || inExcluded(from)) continue
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
  const excluded = findExcludedRanges(state, mathRanges)
  return scanExtensionsIn(state.doc.toString(), 0, excluded)
}
