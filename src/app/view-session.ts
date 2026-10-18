export interface ViewSession {
  sidebar: boolean
  outline: boolean
  focus: boolean
  typewriter: boolean
  source: boolean
  readOnly: boolean
}

export const DEFAULT_VIEW: ViewSession = {
  sidebar: false,
  outline: false,
  focus: false,
  typewriter: false,
  source: false,
  readOnly: false,
}

const KEY = 'yfmd-view'

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function loadViewSession(): ViewSession {
  try {
    const json = localStorage.getItem(KEY)
    if (!json) return { ...DEFAULT_VIEW }
    const raw: unknown = JSON.parse(json)
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_VIEW }
    const r = raw as Record<string, unknown>
    return {
      sidebar: flag(r.sidebar, false),
      outline: flag(r.outline, false),
      focus: flag(r.focus, false),
      typewriter: flag(r.typewriter, false),
      source: flag(r.source, false),
      readOnly: flag(r.readOnly, false),
    }
  } catch {
    return { ...DEFAULT_VIEW }
  }
}

export function saveViewSession(session: ViewSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // ignore a blocked store
  }
}
