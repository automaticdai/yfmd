export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
}

/** Menu and shortcut labels: Ctrl on Windows and Linux, ⌘ on Apple platforms. */
export function formatShortcut(combo: string): string {
  return isMac() ? combo.replaceAll('Ctrl', '⌘') : combo
}
