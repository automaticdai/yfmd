import { afterEach, describe, expect, it } from 'vitest'
import { getLocale, LOCALES, setLocale, t, translate, type Locale, type MessageKey } from './i18n'

afterEach(() => setLocale('en'))

describe('translate', () => {
  it('returns the English string for a known key', () => {
    expect(translate('en', 'file.save')).toBe('Save')
  })

  it('returns the Simplified Chinese string for the same key', () => {
    expect(translate('zh-CN', 'file.save')).toBe('保存')
  })

  it('interpolates {params}', () => {
    expect(translate('en', 'confirm.title', { name: 'a.md' })).toBe('Save changes to a.md?')
    expect(translate('zh-CN', 'toast.exported', { path: '/x.html' })).toBe('已导出到 /x.html')
  })

  it('leaves a missing param placeholder in place', () => {
    expect(translate('en', 'confirm.title', {})).toBe('Save changes to {name}?')
  })

  it('falls back to English for an unknown locale', () => {
    expect(translate('fr' as Locale, 'file.save')).toBe('Save')
  })

  it('returns the key itself when the key is unknown', () => {
    expect(translate('en', 'does.not.exist' as MessageKey)).toBe('does.not.exist')
  })
})

describe('module locale state', () => {
  it('t() reflects the current locale and setLocale', () => {
    setLocale('en')
    expect(t('file.save')).toBe('Save')
    setLocale('zh-CN')
    expect(t('file.save')).toBe('保存')
    expect(getLocale()).toBe('zh-CN')
  })
})

describe('LOCALES', () => {
  it('lists English and Simplified Chinese', () => {
    expect(LOCALES.map(l => l.id)).toEqual(['en', 'zh-CN'])
  })
})
