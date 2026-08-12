import { describe, expect, it } from 'vitest'
import { renderBodyHtml } from './render-html'

describe('renderBodyHtml', () => {
  it('renders GFM basics', () => {
    const html = renderBodyHtml('# T\n\n**b** ~~s~~\n\n| a |\n| - |\n| b |')
    expect(html).toContain('<h1 id="t">T</h1>')
    expect(html).toContain('<strong>b</strong>')
    expect(html).toContain('<s>s</s>')
    expect(html).toContain('<table>')
  })
  it('leaves frontmatter out of the export', () => {
    const html = renderBodyHtml('---\ntitle: Doc\ntags:\n  - a\n---\n\n# Body\n')
    expect(html).toContain('<h1 id="body">Body</h1>')
    expect(html).not.toContain('title: Doc')
    expect(html).not.toContain('<hr>')
    expect(html).not.toContain('<ul>')
  })
  it('renders task lists as disabled checkboxes', () => {
    const html = renderBodyHtml('- [x] done\n- [ ] todo')
    expect(html).toContain('type="checkbox" disabled checked')
    expect(html).toMatch(/type="checkbox" disabled>\s*todo/)
  })
  it('renders inline and block math as MathML', () => {
    const html = renderBodyHtml('a $x^2$ b\n\n$$\nE=mc^2\n$$')
    expect(html.match(/<math/g)!.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('class="math-block"')
  })
  it('does not treat currency as math', () => {
    expect(renderBodyHtml('costs $5 and $10 total')).not.toContain('<math')
  })
  it('marks mermaid fences for post-processing', () => {
    const html = renderBodyHtml('```mermaid\ngraph TD; a-->b\n```')
    expect(html).toContain('<pre class="mermaid-src">')
    expect(html).toContain('a--&gt;b')
  })
  it('highlights code fences', () => {
    const html = renderBodyHtml('```python\ndef f():\n    pass\n```')
    expect(html).toContain('hljs')
    expect(html).toContain('def')
  })
})
