import pkg from '../../package.json'

const RELEASES = 'https://api.github.com/repos/automaticdai/yfmd/releases/latest'

export function parseVersion(value: string): number[] {
  return value.trim().replace(/^v/, '').split('.').map(part => {
    const n = parseInt(part, 10)
    return Number.isFinite(n) ? n : 0
  })
}

/** True when `latest` is a newer dotted version than `current`. */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (av !== bv) return av > bv
  }
  return false
}

export async function fetchLatestRelease(current = pkg.version): Promise<{ latest: string; updateAvailable: boolean }> {
  const res = await fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json() as { tag_name?: unknown }
  const latest = typeof body.tag_name === 'string' ? body.tag_name.replace(/^v/, '') : ''
  if (!latest) throw new Error('missing tag')
  return { latest, updateAvailable: isNewerVersion(latest, current) }
}
