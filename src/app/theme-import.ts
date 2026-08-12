/** Convert a 6-digit hex color to rgba() with the given alpha, or null if not hex. */
export function hexToRgba(hex: string, alpha: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Typora-style custom properties → yfmd tokens.
const VAR_MAP: Record<string, string> = {
  '--bg-color': '--bg',
  '--text-color': '--fg',
  '--primary-color': '--accent',
  '--side-bar-bg-color': '--sidebar-bg',
  '--monospace': '--code-font-default',
}

/**
 * Extract a yfmd palette from a Typora-style theme's `:root { ... }` block.
 * Maps the variables it knows, and derives muted/border/code-bg tints from `--fg`.
 */
export function extractPalette(css: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const block of css.match(/:root\s*\{[^}]*\}/g) ?? []) {
    for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
  }

  const out: Record<string, string> = {}
  for (const [src, dst] of Object.entries(VAR_MAP)) {
    if (vars[src]) out[dst] = vars[src]
  }
  const fg = out['--fg']
  if (fg) {
    const muted = hexToRgba(fg, 0.65)
    const border = hexToRgba(fg, 0.25)
    const codeBg = hexToRgba(fg, 0.08)
    if (muted) out['--fg-muted'] = muted
    if (border) out['--border'] = border
    if (codeBg) out['--code-bg'] = codeBg
  }
  return out
}
