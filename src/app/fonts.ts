export type FontKind = 'sans' | 'serif' | 'mono'

export interface FontOption {
  id: string
  label: string
  kind: FontKind
  /** Preferred families, most specific first. Empty for the stylesheet sentinels. */
  families: string[]
}

/** Appended to every stack so CJK text lands on a real font instead of a system guess. */
const CJK_FALLBACKS: Record<FontKind, string[]> = {
  sans: ['Noto Sans CJK SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei', 'Droid Sans Fallback', 'sans-serif'],
  serif: ['Noto Serif CJK SC', 'Songti SC', 'SimSun', 'Droid Sans Fallback', 'serif'],
  mono: ['Noto Sans Mono CJK SC', 'Droid Sans Fallback', 'monospace'],
}

/** `theme`/`default` mean "change nothing" so the theme's own font keeps winning. */
export const BODY_FONTS: FontOption[] = [
  { id: 'theme', label: 'Follow theme', kind: 'sans', families: [] },
  {
    id: 'system', label: 'System UI', kind: 'sans',
    families: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
  },
  { id: 'georgia', label: 'Georgia', kind: 'serif', families: ['Georgia'] },
  { id: 'palatino', label: 'Palatino', kind: 'serif', families: ['Palatino Linotype', 'Palatino', 'Book Antiqua'] },
  { id: 'times', label: 'Times New Roman', kind: 'serif', families: ['Times New Roman', 'Times'] },
  { id: 'verdana', label: 'Verdana', kind: 'sans', families: ['Verdana', 'Geneva'] },
  {
    id: 'source-han-sans', label: 'Source Han / Noto Sans', kind: 'sans',
    families: ['Source Han Sans SC', 'Noto Sans CJK SC'],
  },
  {
    id: 'source-han-serif', label: 'Source Han / Noto Serif', kind: 'serif',
    families: ['Source Han Serif SC', 'Noto Serif CJK SC'],
  },
  { id: 'pingfang', label: 'PingFang SC', kind: 'sans', families: ['PingFang SC'] },
  { id: 'yahei', label: 'Microsoft YaHei', kind: 'sans', families: ['Microsoft YaHei'] },
  { id: 'lxgw', label: 'LXGW WenKai', kind: 'serif', families: ['LXGW WenKai', 'LXGW WenKai GB'] },
]

export const CODE_FONTS: FontOption[] = [
  { id: 'default', label: 'Default', kind: 'mono', families: [] },
  { id: 'cascadia', label: 'Cascadia Code', kind: 'mono', families: ['Cascadia Code', 'Cascadia Mono'] },
  { id: 'fira', label: 'Fira Code', kind: 'mono', families: ['Fira Code', 'Fira Mono'] },
  { id: 'jetbrains', label: 'JetBrains Mono', kind: 'mono', families: ['JetBrains Mono'] },
  { id: 'consolas', label: 'Consolas', kind: 'mono', families: ['Consolas'] },
  { id: 'menlo', label: 'Menlo / Monaco', kind: 'mono', families: ['Menlo', 'Monaco'] },
  { id: 'courier', label: 'Courier New', kind: 'mono', families: ['Courier New'] },
  { id: 'system-mono', label: 'System monospace', kind: 'mono', families: ['ui-monospace', 'SFMono-Regular'] },
]

/** Bare identifiers stay unquoted; anything else (spaces, digits, CJK) gets quoted. */
const BARE = /^-?[A-Za-z][A-Za-z0-9-]*$/

function cssFamily(name: string): string {
  return BARE.test(name) ? name : `'${name}'`
}

export function findFont(id: string, list: FontOption[]): FontOption | null {
  return list.find(f => f.id === id) ?? null
}

/**
 * The CSS `font-family` value for a font id, or null when the id selects no
 * override (the sentinels and anything unrecognised) and the stylesheet decides.
 */
export function fontStack(id: string, list: FontOption[]): string | null {
  const option = findFont(id, list)
  if (!option || option.families.length === 0) return null
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of [...option.families, ...CJK_FALLBACKS[option.kind]]) {
    const family = cssFamily(name)
    if (seen.has(family)) continue
    seen.add(family)
    out.push(family)
  }
  return out.join(', ')
}
