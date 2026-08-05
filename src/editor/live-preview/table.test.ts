import { describe, expect, it } from 'vitest'
import { formatTable, parseTable, splitRow } from './table'

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
})
