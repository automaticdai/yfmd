import { describe, expect, it } from 'vitest'
import { formatParsedTable, formatTable, parseTable, renderTableCell, splitRow } from './table'

describe('splitRow', () => {
  it('strips outer pipes and trims cells', () => {
    expect(splitRow('| a | b |')).toEqual(['a', 'b'])
    expect(splitRow('a | b')).toEqual(['a', 'b'])
  })
  it('honors escaped pipes', () => {
    expect(splitRow('| a \\| b | c |')).toEqual(['a \\| b', 'c'])
  })
  it('keeps interior empty cells', () => {
    expect(splitRow('| a |  | c |')).toEqual(['a', '', 'c'])
  })
})

describe('parseTable', () => {
  it('parses header, alignment, rows', () => {
    const t = parseTable('| h1 | h2 |\n| :- | -: |\n| a | b |\n| c | d |')!
    expect(t.header).toEqual(['h1', 'h2'])
    expect(t.align).toEqual(['left', 'right'])
    expect(t.rows).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('rejects non-tables', () => {
    expect(parseTable('just text')).toBeNull()
    expect(parseTable('| a |\n| b |')).toBeNull()
  })
})

describe('formatTable', () => {
  it('pads pipes to uniform width', () => {
    expect(formatTable('| a | bb |\n| - | - |\n| ccc | d |')).toBe(
      '| a   | bb  |\n| --- | --- |\n| ccc | d   |')
  })
  it('preserves alignment colons and aligns cell text', () => {
    expect(formatTable('| h | i |\n| :- | -: |\n| a | b |')).toBe(
      '| h   |   i |\n| :-- | --: |\n| a   |   b |')
  })
  it('returns invalid input unchanged', () => {
    expect(formatTable('nope')).toBe('nope')
  })
  it('formats with explicit column widths', () => {
    const parsed = parseTable('| a | b |\n| - | - |\n| c | d |')!
    expect(formatParsedTable(parsed, [5, 3])).toBe('| a     | b   |\n| ----- | --- |\n| c     | d   |')
  })
  it('clamps narrow explicit widths instead of throwing RangeError', () => {
    const parsed = parseTable('| header | b |\n| :---: | -: |\n| longcell | d |')!
    expect(formatParsedTable(parsed, [1, 1])).toBe(
      '|  header  |   b |\n| :------: | --: |\n| longcell |   d |')
  })
})

describe('renderTableCell', () => {
  it('renders inline math, highlight, scripts, and emoji inside cells', () => {
    const html = renderTableCell('$x^2$ ==hi== H~2~O a^b^ :rocket:')
    expect(html).toContain('katex')
    expect(html).toContain('<mark class="cm-mark">hi</mark>')
    expect(html).toContain('<sub>2</sub>')
    expect(html).toContain('<sup>b</sup>')
    expect(html).toContain('🚀')
  })
})
