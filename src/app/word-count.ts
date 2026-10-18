export interface DocStats { words: number; chars: number; lines: number; cjk: number }

const CJK = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/gu
const WORD = /[\p{L}\p{N}]+/gu

/**
 * Count words, characters and lines. Each CJK character is its own word;
 * a Latin or number run is one word. `cjk` is the character count used
 * for reading time.
 */
export function countDocStats(text: string): DocStats {
  if (!text) return { words: 0, chars: 0, lines: 0, cjk: 0 }
  let cjk = 0
  const withoutCjk = text.replace(CJK, () => { cjk++; return ' ' })
  const latin = withoutCjk.match(WORD)?.length ?? 0
  return {
    words: latin + cjk,
    chars: text.length,
    lines: text.split('\n').length,
    cjk,
  }
}

/**
 * Minutes to read. Latin words at 200/min, CJK characters at 400/min.
 * Empty text still reports 1 so the status tooltip stays put.
 */
export function readingMinutes(stats: Pick<DocStats, 'words' | 'cjk'>): number {
  const latin = Math.max(0, stats.words - stats.cjk)
  const minutes = latin / 200 + stats.cjk / 400
  return Math.max(1, Math.ceil(minutes))
}
