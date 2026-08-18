import { afterEach, describe, expect, it } from 'vitest'
import { addRecent, clearRecent, formatRecentLabels, loadRecent, RECENT_LIMIT, removeRecent } from './recent-files'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const storage = new MemStorage()
;(globalThis as unknown as Record<string, unknown>).localStorage = storage

afterEach(() => storage.clear())

describe('recent files', () => {
  it('starts empty', () => {
    expect(loadRecent()).toEqual([])
  })

  it('adds most-recent-first and dedupes', () => {
    addRecent('/a.md')
    addRecent('/b.md')
    addRecent('/a.md')
    expect(loadRecent()).toEqual(['/a.md', '/b.md'])
  })

  it('caps the list at RECENT_LIMIT', () => {
    for (let i = 0; i < RECENT_LIMIT + 5; i++) addRecent(`/f${i}.md`)
    const list = loadRecent()
    expect(list).toHaveLength(RECENT_LIMIT)
    expect(list[0]).toBe(`/f${RECENT_LIMIT + 4}.md`)
  })

  it('clears', () => {
    addRecent('/a.md')
    clearRecent()
    expect(loadRecent()).toEqual([])
  })

  it('survives corrupt JSON', () => {
    storage.setItem('yfmd-recent', '{not json')
    expect(loadRecent()).toEqual([])
  })
})

describe('removeRecent', () => {
  it('removes a single entry and persists', () => {
    addRecent('/a.md')
    addRecent('/b.md')
    addRecent('/c.md')
    const result = removeRecent('/b.md')
    expect(result).toEqual(['/c.md', '/a.md'])
    expect(loadRecent()).toEqual(['/c.md', '/a.md'])
  })

  it('returns unchanged list when removing a non-existent path', () => {
    addRecent('/a.md')
    const result = removeRecent('/z.md')
    expect(result).toEqual(['/a.md'])
  })

  it('returns empty list when removing from empty', () => {
    expect(removeRecent('/a.md')).toEqual([])
  })
})

describe('formatRecentLabels', () => {
  it('uses basename when all are unique', () => {
    const result = formatRecentLabels(['/docs/a.md', '/src/b.md'])
    expect(result).toEqual([
      { path: '/docs/a.md', label: 'a.md' },
      { path: '/src/b.md', label: 'b.md' },
    ])
  })

  it('disambiguates with parent directory when basenames collide', () => {
    const result = formatRecentLabels(['/docs/README.md', '/src/README.md', '/notes/unique.md'])
    expect(result).toEqual([
      { path: '/docs/README.md', label: 'README.md — docs' },
      { path: '/src/README.md', label: 'README.md — src' },
      { path: '/notes/unique.md', label: 'unique.md' },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(formatRecentLabels([])).toEqual([])
  })

  it('handles root-level paths', () => {
    const result = formatRecentLabels(['/a.md', '/b.md'])
    expect(result).toEqual([
      { path: '/a.md', label: 'a.md' },
      { path: '/b.md', label: 'b.md' },
    ])
  })

  it('disambiguates root-level vs nested when basenames collide', () => {
    const result = formatRecentLabels(['/a.md', '/docs/a.md'])
    expect(result).toEqual([
      { path: '/a.md', label: 'a.md — ' },
      { path: '/docs/a.md', label: 'a.md — docs' },
    ])
  })
})
