import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadViewSession, saveViewSession } from './view-session'

describe('view session', () => {
  const store = new Map<string, string>()
  afterEach(() => { store.clear(); vi.unstubAllGlobals() })

  it('round-trips the view toggles and ignores corrupt data', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    })
    expect(loadViewSession().sidebar).toBe(false)
    saveViewSession({ sidebar: true, outline: true, focus: true, typewriter: false, source: true, readOnly: false })
    expect(loadViewSession()).toMatchObject({ sidebar: true, outline: true, focus: true, source: true })
    store.set('yfmd-view', '{')
    expect(loadViewSession().sidebar).toBe(false)
  })
})
