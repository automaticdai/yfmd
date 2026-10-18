import { describe, expect, it, vi } from 'vitest'
import { fetchLatestRelease, isNewerVersion } from './updates'

describe('isNewerVersion', () => {
  it('compares dotted versions', () => {
    expect(isNewerVersion('0.10.2', '0.10.1')).toBe(true)
    expect(isNewerVersion('v0.10.1', '0.10.1')).toBe(false)
    expect(isNewerVersion('0.9.9', '0.10.1')).toBe(false)
    expect(isNewerVersion('1.0', '0.10.1')).toBe(true)
  })
})

describe('fetchLatestRelease', () => {
  it('reports an update when the latest tag is newer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ tag_name: 'v9.0.0' }),
    })))
    await expect(fetchLatestRelease('0.10.1')).resolves.toEqual({ latest: '9.0.0', updateAvailable: true })
    vi.unstubAllGlobals()
  })

  it('throws when the release lookup fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })))
    await expect(fetchLatestRelease('0.10.1')).rejects.toThrow(/403/)
    vi.unstubAllGlobals()
  })
})
