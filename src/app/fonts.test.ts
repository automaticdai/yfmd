import { describe, expect, it } from 'vitest'
import { BODY_FONTS, CODE_FONTS, fontStack } from './fonts'

describe('font catalogue', () => {
  it('starts each list with a sentinel that defers to the stylesheet', () => {
    expect(BODY_FONTS[0].id).toBe('theme')
    expect(CODE_FONTS[0].id).toBe('default')
    expect(fontStack('theme', BODY_FONTS)).toBeNull()
    expect(fontStack('default', CODE_FONTS)).toBeNull()
  })
  it('gives every selectable font a unique id and at least one family', () => {
    for (const list of [BODY_FONTS, CODE_FONTS]) {
      const ids = list.map(f => f.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const f of list.slice(1)) expect(f.families.length).toBeGreaterThan(0)
    }
  })
  it('returns null for an unknown id', () => {
    expect(fontStack('comic-sans', BODY_FONTS)).toBeNull()
  })
})

describe('fontStack', () => {
  it('appends the sans CJK fallbacks to a sans font', () => {
    const s = fontStack('system', BODY_FONTS)!
    expect(s.startsWith('-apple-system,')).toBe(true)
    expect(s.endsWith(
      "'Noto Sans CJK SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', 'Droid Sans Fallback', sans-serif",
    )).toBe(true)
  })
  it('appends serif CJK fallbacks to a serif font', () => {
    const s = fontStack('georgia', BODY_FONTS)!
    expect(s.startsWith('Georgia,')).toBe(true)
    expect(s).toContain("'Noto Serif CJK SC'")
    expect(s.endsWith('serif')).toBe(true)
    expect(s).not.toContain('sans-serif')
  })
  it('appends mono CJK fallbacks to a code font', () => {
    const s = fontStack('cascadia', CODE_FONTS)!
    expect(s.startsWith("'Cascadia Code',")).toBe(true)
    expect(s.endsWith("'Noto Sans Mono CJK SC', 'Droid Sans Fallback', monospace")).toBe(true)
  })
  it('quotes multi-word families and leaves keywords bare', () => {
    const s = fontStack('system', BODY_FONTS)!
    expect(s).toContain("'Segoe UI'")
    expect(s).toContain('-apple-system')
    expect(s).not.toContain("'-apple-system'")
  })
  it('never lists the same family twice', () => {
    for (const list of [BODY_FONTS, CODE_FONTS]) {
      for (const f of list) {
        const s = fontStack(f.id, list)
        if (s === null) continue
        const parts = s.split(',').map(p => p.trim())
        expect(new Set(parts).size).toBe(parts.length)
      }
    }
  })
})
