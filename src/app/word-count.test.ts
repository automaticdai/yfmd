import { describe, expect, it } from 'vitest'
import { countDocStats, readingMinutes } from './word-count'

describe('countDocStats', () => {
  it('counts words, chars and lines', () => {
    expect(countDocStats('hello world')).toEqual({ words: 2, chars: 11, lines: 1, cjk: 0 })
    expect(countDocStats('a\nb\nc')).toEqual({ words: 3, chars: 5, lines: 3, cjk: 0 })
    expect(countDocStats('')).toEqual({ words: 0, chars: 0, lines: 0, cjk: 0 })
  })

  it('counts each CJK character as a word and keeps number runs', () => {
    expect(countDocStats('深度神经网络 0123')).toEqual({ words: 7, chars: 11, lines: 1, cjk: 6 })
  })

  it('counts hiragana, katakana and hangul per character', () => {
    expect(countDocStats('あア한').cjk).toBe(3)
    expect(countDocStats('あア한').words).toBe(3)
  })

  it('ignores punctuation-only runs', () => {
    expect(countDocStats('... --- ???')).toEqual({ words: 0, chars: 11, lines: 1, cjk: 0 })
  })
})

describe('readingMinutes', () => {
  it('estimates Latin words at 200 per minute with a floor of 1', () => {
    expect(readingMinutes({ words: 0, cjk: 0 })).toBe(1)
    expect(readingMinutes({ words: 100, cjk: 0 })).toBe(1)
    expect(readingMinutes({ words: 300, cjk: 0 })).toBe(2)
  })

  it('estimates CJK characters at 400 per minute', () => {
    expect(readingMinutes({ words: 400, cjk: 400 })).toBe(1)
    expect(readingMinutes({ words: 800, cjk: 800 })).toBe(2)
  })
})
