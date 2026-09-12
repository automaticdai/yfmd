import { describe, expect, it } from 'vitest'
import { renderBodyHtml, renderExportHtml } from './render-html'

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
  it('renders mark, sup, sub, emoji and footnotes', () => {
    const html = renderBodyHtml('==hi== x^2^ H~2~O :fire: note[^1]')
    expect(html).toContain('<mark>hi</mark>')
    expect(html).toContain('<sup>2</sup>')
    expect(html).toContain('<sub>2</sub>')
    expect(html).toContain('🔥')
    expect(html).toContain('fnref:1')
  })
  it('renders GitHub alert quote blocks (Note, Tip, Important, Warning, Caution)', () => {
    const markdown = [
      '> [!NOTE]',
      '> Highlights information',
      '',
      '> [!TIP]',
      '> Helpful tip',
      '',
      '> [!IMPORTANT]',
      '> Important details',
      '',
      '> [!WARNING]',
      '> Warning alert',
      '',
      '> [!CAUTION]',
      '> Caution alert',
    ].join('\n')
    const html = renderBodyHtml(markdown)
    expect(html).toContain('class="markdown-alert markdown-alert-note"')
    expect(html).toContain('class="markdown-alert markdown-alert-tip"')
    expect(html).toContain('class="markdown-alert markdown-alert-important"')
    expect(html).toContain('class="markdown-alert markdown-alert-warning"')
    expect(html).toContain('class="markdown-alert markdown-alert-caution"')
    expect(html).toContain('class="markdown-alert-title"')
    expect(html).toContain('Highlights information')
    expect(html).toContain('Helpful tip')
  })
})


describe('renderBodyHtml footnotes', () => {
  it('numbers references by order of first appearance', () => {
    const html = renderBodyHtml('x[^b] y[^a] z[^b]')
    expect(html).toContain('>1</a>')
    expect(html).toContain('>2</a>')
    expect(html).not.toContain('>b</a>')
  })

  it('collects definitions into a footnotes list instead of leaving them as paragraphs', () => {
    const html = renderBodyHtml('claim[^a]\n\n[^a]: the source\n')
    expect(html).toContain('class="footnotes"')
    expect(html).toContain('id="fn:a"')
    expect(html).toContain('the source')
    expect(html).not.toContain('<p>[^a]: the source</p>')
  })

  it('links a definition back to its reference', () => {
    const html = renderBodyHtml('claim[^a]\n\n[^a]: the source\n')
    expect(html).toContain('href="#fnref:a"')
    expect(html).toContain('href="#fn:a"')
  })

  it('renders inline markdown inside a definition', () => {
    expect(renderBodyHtml('c[^a]\n\n[^a]: see **bold**\n')).toContain('<strong>bold</strong>')
  })

  it('orders the list by footnote number, not by definition order', () => {
    const html = renderBodyHtml('x[^b] y[^a]\n\n[^a]: second\n[^b]: first\n')
    expect(html.indexOf('id="fn:b"')).toBeLessThan(html.indexOf('id="fn:a"'))
  })

  it('does not pair the caret in a footnote marker with a real superscript', () => {
    const html = renderBodyHtml('claim[^a] with x^2^')
    expect(html).toContain('<sup>2</sup>')
    expect(html).not.toContain('a] with x')
  })

  it('leaves footnote syntax literal when references are disabled', () => {
    const html = renderBodyHtml('claim[^a]\n\n[^a]: the source\n', { references: false })
    expect(html).toContain('[^a]')
    expect(html).not.toContain('class="footnotes"')
  })
})

describe('renderBodyHtml syntax toggles', () => {
  it('leaves ==highlight== literal when highlight is disabled', () => {
    const html = renderBodyHtml('==hi== x^2^', { highlight: false })
    expect(html).not.toContain('<mark>')
    expect(html).toContain('==hi==')
    expect(html).toContain('<sup>2</sup>')
  })

  it('leaves ^sup^ and ~sub~ literal when scripts are disabled', () => {
    const html = renderBodyHtml('==hi== x^2^ H~2~O', { scripts: false })
    expect(html).not.toContain('<sup>')
    expect(html).not.toContain('<sub>')
    expect(html).toContain('<mark>hi</mark>')
  })

  it('renders everything by default', () => {
    const html = renderBodyHtml('==hi== x^2^ H~2~O c[^a]')
    expect(html).toContain('<mark>hi</mark>')
    expect(html).toContain('<sup>2</sup>')
    expect(html).toContain('<sub>2</sub>')
  })
})

describe('renderExportHtml syntax toggles', () => {
  it('honours disabled syntaxes in the standalone document', async () => {
    const html = await renderExportHtml('==hi== c[^a]\n\n[^a]: note\n', 'T', '', { highlight: false })
    expect(html).toContain('==hi==')
    expect(html).not.toContain('<mark>')
    expect(html).toContain('class="footnotes"')
  })

  it('renders every syntax when no options are given', async () => {
    const html = await renderExportHtml('==hi== c[^a]\n\n[^a]: note\n', 'T')
    expect(html).toContain('<mark>hi</mark>')
    expect(html).toContain('class="footnotes"')
  })
})
