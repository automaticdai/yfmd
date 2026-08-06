import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, THEMES } from './settings'

// node environment: emulate localStorage
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

describe('THEMES', () => {
  it('exposes the four built-ins with dark flags', () => {
    expect(THEMES.map(t => t.id)).toEqual(['github', 'night', 'newsprint', 'whitey'])
    expect(THEMES.find(t => t.id === 'night')!.dark).toBe(true)
    expect(THEMES.filter(t => t.dark)).toHaveLength(1)
  })
})

describe('loadSettings', () => {
  it('returns defaults when nothing stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('round-trips saved settings', () => {
    const s = { ...DEFAULT_SETTINGS, theme: 'night' as const, maxWidth: 60, autosave: true }
    saveSettings(s)
    expect(loadSettings()).toEqual(s)
  })
  it('clamps numeric values and rejects bad enums', () => {
    storage.setItem('yfmd-settings', JSON.stringify({
      theme: 'hotdog', maxWidth: 500, sideMargin: -2, fontSize: 'huge', lineHeight: 9,
      sidebarTab: 'bogus',
    }))
    const s = loadSettings()
    expect(s.theme).toBe('github')
    expect(s.maxWidth).toBe(80)
    expect(s.sideMargin).toBe(0)
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(s.lineHeight).toBe(2.2)
    expect(s.sidebarTab).toBe('files')
  })
  it('survives corrupt JSON', () => {
    storage.setItem('yfmd-settings', '{not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
  it('migrates the legacy yfmd-theme key when no settings exist', () => {
    storage.setItem('yfmd-theme', 'dark')
    expect(loadSettings().theme).toBe('night')
    storage.setItem('yfmd-theme', 'light')
    expect(loadSettings().theme).toBe('github')
  })
  it('stored settings win over the legacy key', () => {
    storage.setItem('yfmd-theme', 'dark')
    saveSettings({ ...DEFAULT_SETTINGS, theme: 'newsprint' })
    expect(loadSettings().theme).toBe('newsprint')
  })
})
