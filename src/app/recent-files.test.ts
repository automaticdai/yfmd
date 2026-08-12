import { afterEach, describe, expect, it } from 'vitest'
import { addRecent, clearRecent, loadRecent, RECENT_LIMIT } from './recent-files'

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
