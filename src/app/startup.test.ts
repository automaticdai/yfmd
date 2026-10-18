import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseStartupDocument, GUIDE_SEEN_KEY, markGuideSeen, readGuideSeen, startupDocument } from './startup'

describe('startupDocument', () => {
  it('shows the guide only when it has not been seen', () => {
    expect(startupDocument('# Guide', false)).toBe('# Guide')
    expect(startupDocument('# Guide', true)).toBe('')
  })
})

describe('guide flag', () => {
  const store = new Map<string, string>()
  afterEach(() => { store.clear(); vi.unstubAllGlobals() })

  it('reads and writes the seen flag', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    })
    expect(readGuideSeen()).toBe(false)
    markGuideSeen()
    expect(store.get(GUIDE_SEEN_KEY)).toBe('1')
    expect(readGuideSeen()).toBe(true)
  })

  it('treats a missing store as already seen', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    expect(readGuideSeen()).toBe(true)
    expect(() => markGuideSeen()).not.toThrow()
  })

  it('chooses the guide once, then stays on that choice', () => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
    })
    expect(chooseStartupDocument('# Guide')).toBe('# Guide')
    expect(chooseStartupDocument('# Guide')).toBe('# Guide')
    expect(readGuideSeen()).toBe(true)
  })
})
