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

/** Remove a single path from the recent list and persist. Returns the new list. */
export function removeRecent(path: string): string[] {
  const next = loadRecent().filter(p => p !== path)
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

function basename(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1)
}

function parentName(p: string): string {
  const dir = p.slice(0, p.lastIndexOf('/'))
  return dir.slice(dir.lastIndexOf('/') + 1) || dir
}

/**
 * Build display labels for a list of recent paths.
 * Uses basename alone when unambiguous; appends ` — parentDir` when two
 * entries share the same basename so the user can tell them apart.
 */
export function formatRecentLabels(paths: string[]): { path: string; label: string }[] {
  const counts = new Map<string, number>()
  for (const p of paths) {
    const b = basename(p)
    counts.set(b, (counts.get(b) ?? 0) + 1)
  }
  return paths.map(p => {
    const b = basename(p)
    const label = (counts.get(b) ?? 0) > 1 ? `${b} — ${parentName(p)}` : b
    return { path: p, label }
  })
}
