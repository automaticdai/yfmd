import { describe, expect, it } from 'vitest'
import { sanitizeThemeCss } from './theme-css'

describe('sanitizeThemeCss', () => {
  it('keeps ordinary declarations', () => {
    expect(sanitizeThemeCss(':root { --bg: #fff; }')).toBe(':root { --bg: #fff; }')
  })

  it('stops a style tag from being closed early', () => {
    const css = 'body{}</style><script>alert(1)</script>'
    expect(sanitizeThemeCss(css)).not.toContain('</style')
    expect(sanitizeThemeCss(css)).toContain('<\\/style')
  })

  it('drops remote imports and scriptable urls', () => {
    const css = '@import "https://evil.test/x.css"; a{background:url(javascript:alert(1)); width:expression(alert(1))}'
    const out = sanitizeThemeCss(css)
    expect(out).not.toMatch(/@import/i)
    expect(out).not.toMatch(/javascript\s*:/i)
    expect(out).not.toMatch(/expression\s*\(/i)
  })
})
