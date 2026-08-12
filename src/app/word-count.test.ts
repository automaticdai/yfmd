import { describe, expect, it } from 'vitest'
import { countDocStats, readingMinutes } from './word-count'

describe('countDocStats', () => {
  it('counts words, chars and lines', () => {
    expect(countDocStats('hello world')).toEqual({ words: 2, chars: 11, lines: 1 })
    expect(countDocStats('a\nb\nc')).toEqual({ words: 3, chars: 5, lines: 3 })
    expect(countDocStats('')).toEqual({ words: 0, chars: 0, lines: 0 })
  })

  it('counts CJK and numbers as words', () => {
    expect(countDocStats('深度神经网络 0123')).toEqual({ words: 2, chars: 11, lines: 1 })
  })

  it('ignores punctuation-only runs', () => {
    expect(countDocStats('... --- ???')).toEqual({ words: 0, chars: 11, lines: 1 })
  })
})

describe('readingMinutes', () => {
  it('estimates from word count with a floor of 1', () => {
    expect(readingMinutes(0)).toBe(1)
    expect(readingMinutes(100)).toBe(1)
    expect(readingMinutes(300)).toBe(2)
  })
})
