export interface DocStats { words: number; chars: number; lines: number }

const WORD = /[\p{L}\p{N}]+/gu

/** Count words (Unicode-aware, CJK/number runs count as one), characters and lines. */
export function countDocStats(text: string): DocStats {
  return {
    words: text ? (text.match(WORD) ?? []).length : 0,
    chars: text.length,
    lines: text === '' ? 0 : text.split('\n').length,
  }
}

/** Rough reading-time estimate in minutes (200 words/minute). */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200))
}
