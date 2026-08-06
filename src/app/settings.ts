export type ThemeName = 'github' | 'night' | 'newsprint' | 'whitey'

export interface ThemeInfo { id: ThemeName; label: string; dark: boolean }

export const THEMES: ThemeInfo[] = [
  { id: 'github', label: 'GitHub', dark: false },
  { id: 'night', label: 'Night', dark: true },
  { id: 'newsprint', label: 'Newsprint', dark: false },
  { id: 'whitey', label: 'Whitey', dark: false },
]

export interface Settings {
  theme: ThemeName
  maxWidth: number      // rem
  sideMargin: number    // rem
  fontSize: number      // px
  lineHeight: number
  autosave: boolean
  sidebarTab: 'files' | 'outline'
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'github',
  maxWidth: 46,
  sideMargin: 3,
  fontSize: 16,
  lineHeight: 1.7,
  autosave: false,
  sidebarTab: 'files',
}

export const SETTINGS_LIMITS = {
  maxWidth: { min: 40, max: 80, step: 1 },
  sideMargin: { min: 0, max: 8, step: 0.5 },
  fontSize: { min: 12, max: 24, step: 1 },
  lineHeight: { min: 1.2, max: 2.2, step: 0.05 },
} as const

const STORAGE_KEY = 'yfmd-settings'
const LEGACY_THEME_KEY = 'yfmd-theme'

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, n))
}

export function loadSettings(): Settings {
  let raw: Record<string, unknown> = {}
  let hasStored = false
  try {
    const json = localStorage.getItem(STORAGE_KEY)
    if (json !== null) {
      const parsed: unknown = JSON.parse(json)
      if (parsed && typeof parsed === 'object') {
        raw = parsed as Record<string, unknown>
        hasStored = true
      }
    }
  } catch {
    // corrupt JSON → defaults
  }

  let theme = THEMES.some(t => t.id === raw.theme)
    ? (raw.theme as ThemeName)
    : DEFAULT_SETTINGS.theme
  if (!hasStored) {
    const legacy = localStorage.getItem(LEGACY_THEME_KEY)
    if (legacy === 'dark') theme = 'night'
    else if (legacy === 'light') theme = 'github'
  }

  const L = SETTINGS_LIMITS
  const D = DEFAULT_SETTINGS
  return {
    theme,
    maxWidth: num(raw.maxWidth, D.maxWidth, L.maxWidth.min, L.maxWidth.max),
    sideMargin: num(raw.sideMargin, D.sideMargin, L.sideMargin.min, L.sideMargin.max),
    fontSize: num(raw.fontSize, D.fontSize, L.fontSize.min, L.fontSize.max),
    lineHeight: num(raw.lineHeight, D.lineHeight, L.lineHeight.min, L.lineHeight.max),
    autosave: typeof raw.autosave === 'boolean' ? raw.autosave : D.autosave,
    sidebarTab: raw.sidebarTab === 'outline' ? 'outline' : 'files',
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}
