export const GUIDE_SEEN_KEY = 'yfmd-seen-guide'

/** Blank after the guide has been shown once; the guide itself otherwise. */
export function startupDocument(welcome: string, seen: boolean): string {
  return seen ? '' : welcome
}

export function readGuideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markGuideSeen(): void {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1')
  } catch {
    // private mode or a blocked store — next launch stays blank
  }
}

let chosen: string | null = null

/**
 * Pick the startup buffer once per page load. React StrictMode runs the mount
 * effect twice; a second call must return the same text, not the blank page
 * that the first call's flag write would otherwise produce.
 */
export function chooseStartupDocument(welcome: string): string {
  if (chosen === null) {
    const seen = readGuideSeen()
    chosen = startupDocument(welcome, seen)
    if (!seen) markGuideSeen()
  }
  return chosen
}
