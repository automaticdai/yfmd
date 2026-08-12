import { describe, expect, it } from 'vitest'
import { extractPalette, hexToRgba } from './theme-import'

describe('hexToRgba', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#d4d4d4', 0.65)).toBe('rgba(212, 212, 212, 0.65)')
    expect(hexToRgba('1e1e1e', 0.5)).toBe('rgba(30, 30, 30, 0.5)')
  })
  it('returns null for non-hex', () => {
    expect(hexToRgba('var(--x)', 0.5)).toBeNull()
    expect(hexToRgba('rgb(1,2,3)', 0.5)).toBeNull()
  })
})

describe('extractPalette', () => {
  const css = `:root {
    --bg-color: #1e1e1e;
    --text-color: #d4d4d4;
    --primary-color: #6ea8fe;
    --side-bar-bg-color: #252526;
    --monospace: 'Cascadia Code', monospace;
  }`

  it('maps Typora variables to yfmd tokens and derives tints', () => {
    expect(extractPalette(css)).toEqual({
      '--bg': '#1e1e1e',
      '--fg': '#d4d4d4',
      '--accent': '#6ea8fe',
      '--sidebar-bg': '#252526',
      '--code-font-default': "'Cascadia Code', monospace",
      '--fg-muted': 'rgba(212, 212, 212, 0.65)',
      '--border': 'rgba(212, 212, 212, 0.25)',
      '--code-bg': 'rgba(212, 212, 212, 0.08)',
    })
  })

  it('returns an empty map for CSS without :root variables', () => {
    expect(extractPalette('h1 { color: red; }')).toEqual({})
  })
})
