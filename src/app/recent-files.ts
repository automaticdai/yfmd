const STORAGE_KEY = 'yfmd-recent'

export const RECENT_LIMIT = 10

/** Most-recent-first list of file paths, from localStorage. Tolerant of a missing/corrupt store. */
export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => typeof p === 'string').slice(0, RECENT_LIMIT)
    }
  } catch {
    // corrupt JSON or no localStorage (node test env) → empty
  }
  return []
}

/** Add a path to the front, dedupe, cap at RECENT_LIMIT, and persist. Returns the new list. */
export function addRecent(path: string): string[] {
  const next = [path, ...loadRecent().filter(p => p !== path)].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // no localStorage → keep the in-memory result
  }
  return next
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no localStorage → nothing to clear
  }
}
