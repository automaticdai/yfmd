/** An inline `[^id]` marker. */
export interface FootnoteRef { from: number; to: number; id: string; num: number }

/** A `[^id]: text` definition line. `markerTo` ends just past the marker and its trailing space. */
export interface FootnoteDef { from: number; to: number; markerTo: number; id: string; num: number }

export interface Footnotes { refs: FootnoteRef[]; defs: FootnoteDef[] }

const REF = /\[\^([\w-]+)\]/g
const DEF = /^\[\^([\w-]+)\]:[ \t]*/

/**
 * Find footnote references and definitions in `doc`, numbering them by order of first
 * reference — definitions with no reference are numbered after the referenced ones, so
 * every footnote has a stable number regardless of where its definition sits.
 */
export function scanFootnotes(doc: string, excluded: Array<[number, number]>): Footnotes {
  const inExcluded = (pos: number) => excluded.some(([f, t]) => pos >= f && pos < t)
  const numbers = new Map<string, number>()
  const numberOf = (id: string) => {
    let n = numbers.get(id)
    if (n === undefined) { n = numbers.size + 1; numbers.set(id, n) }
    return n
  }

  const refs: FootnoteRef[] = []
  const pending: Array<{ from: number; to: number; markerTo: number; id: string }> = []

  let pos = 0
  for (const line of doc.split('\n')) {
    const lineFrom = pos
    pos += line.length + 1

    const def = DEF.exec(line)
    if (def && !inExcluded(lineFrom)) {
      pending.push({
        from: lineFrom,
        to: lineFrom + line.length,
        markerTo: lineFrom + def[0].length,
        id: def[1],
      })
      continue
    }

    REF.lastIndex = 0
    for (const m of line.matchAll(REF)) {
      const from = lineFrom + m.index
      if (inExcluded(from)) continue
      refs.push({ from, to: from + m[0].length, id: m[1], num: numberOf(m[1]) })
    }
  }

  const defs: FootnoteDef[] = pending.map(d => ({ ...d, num: numberOf(d.id) }))
  return { refs, defs }
}

