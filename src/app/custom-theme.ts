const KEY = 'yfmd-custom-theme'

export function loadCustomTheme(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveCustomTheme(css: string): void {
  try {
    if (css) localStorage.setItem(KEY, css)
    else localStorage.removeItem(KEY)
  } catch {
    // no localStorage → no-op
  }
}
