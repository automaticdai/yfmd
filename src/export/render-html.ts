import hljs from 'highlight.js'
import hljsCss from 'highlight.js/styles/github.css?raw'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import type { RenderRule } from 'markdown-it/lib/renderer.mjs'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import mermaid from 'mermaid'

function mathInlineRule(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state
  if (src[pos] !== '$' || src[pos + 1] === '$') return false
  if (src[pos - 1] === '\\' || src[pos - 1] === '$') return false
  let end = pos + 1
  while ((end = src.indexOf('$', end)) !== -1) {
    if (src[end - 1] !== '\\') break
    end += 1
  }
  if (end === -1) return false
  const tex = src.slice(pos + 1, end)
  if (tex.length === 0 || /^\s|\s$/.test(tex) || tex.includes('\n')) return false
  if (/\d/.test(src[end + 1] ?? '')) return false
  if (!silent) {
    const token = state.push('math_inline', 'math', 0)
    token.content = tex
  }
  state.pos = end + 1
  return true
}

function mathBlockRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  if (!state.src.startsWith('$$', start)) return false
  if (silent) return true
  let line = startLine
  let content = ''
  const firstRest = state.src.slice(start + 2, state.eMarks[startLine]).trim()
  let found = false
  if (firstRest.endsWith('$$') && firstRest.length >= 2) {
    content = firstRest.slice(0, -2).trim()
    found = true
  } else {
    content = firstRest === '' ? '' : firstRest + '\n'
    for (line = startLine + 1; line < endLine; line++) {
      const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]).trim()
      if (text.endsWith('$$')) {
        content += text.slice(0, -2).trim()
        found = true
        break
      }
      content += text + '\n'
    }
  }
  if (!found) return false
  const token = state.push('math_block', 'math', 0)
  token.content = content.trim()
  token.map = [startLine, line + 1]
  state.line = line + 1
  return true
}

function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'task-lists', state => {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type !== 'inline' || !t.children?.length) continue
      if (tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') continue
      const first = t.children[0]
      if (first.type !== 'text') continue
      const m = /^\[([ xX])\] /.exec(first.content)
      if (!m) continue
      first.content = first.content.slice(m[0].length)
      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.content = `<input type="checkbox" disabled${/[xX]/.test(m[1]) ? ' checked' : ''}> `
      t.children.unshift(checkbox)
      tokens[i - 2].attrJoin('class', 'task-list-item')
    }
  })
}

export function createExportRenderer(): MarkdownIt {
  const md: MarkdownIt = new MarkdownIt({
    html: false,
    linkify: true,
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`
      }
      return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`
    },
  })
  md.use(taskListPlugin)
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule)
  md.block.ruler.after('fence', 'math_block', mathBlockRule)
  const mathInline: RenderRule = (tokens, idx) =>
    katex.renderToString(tokens[idx].content, { throwOnError: false, output: 'mathml' })
  const mathBlock: RenderRule = (tokens, idx) =>
    `<div class="math-block">${katex.renderToString(tokens[idx].content, {
      throwOnError: false, output: 'mathml', displayMode: true,
    })}</div>\n`
  md.renderer.rules.math_inline = mathInline
  md.renderer.rules.math_block = mathBlock
  const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules)
  const fence: RenderRule = (tokens, idx, options, env, self) => {
    if (tokens[idx].info.trim().toLowerCase() === 'mermaid') {
      return `<pre class="mermaid-src">${md.utils.escapeHtml(tokens[idx].content)}</pre>\n`
    }
    return defaultFence(tokens, idx, options, env, self)
  }
  md.renderer.rules.fence = fence
  return md
}

const renderer = createExportRenderer()

export function renderBodyHtml(markdown: string): string {
  return renderer.render(markdown)
}

let exportMermaidReady = false

export async function renderMermaidBlocks(html: string): Promise<string> {
  if (!html.includes('mermaid-src')) return html
  if (!exportMermaidReady) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' })
    exportMermaidReady = true
  }
  const template = document.createElement('template')
  template.innerHTML = html
  const blocks = [...template.content.querySelectorAll('pre.mermaid-src')]
  for (let i = 0; i < blocks.length; i++) {
    const code = blocks[i].textContent ?? ''
    const holder = document.createElement('div')
    holder.className = 'mermaid-diagram'
    try {
      const { svg } = await mermaid.render(`yfmd-export-${Date.now()}-${i}`, code)
      holder.innerHTML = svg
    } catch (err) {
      holder.innerHTML = `<pre class="mermaid-error">Mermaid error: ${
        renderer.utils.escapeHtml(err instanceof Error ? err.message : String(err))
      }</pre>`
    }
    blocks[i].replaceWith(holder)
  }
  return template.innerHTML
}

const EXPORT_CSS = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Noto Sans CJK SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
    color: #333; line-height: 1.7; max-width: 46rem; margin: 0 auto;
    padding: 2rem 3rem 4rem;
  }
  h1, h2, h3, h4, h5, h6 { line-height: 1.4; margin: 1.2em 0 0.5em; }
  h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.6em; }
  h3 { font-size: 1.3em; }
  a { color: #4a89dc; }
  blockquote { border-left: 4px solid #e5e5e5; margin-left: 0; padding-left: 1em; color: #777; }
  code { font-family: Consolas, 'Fira Code', monospace; font-size: 0.9em;
         background: #f4f4f4; border-radius: 3px; padding: 1px 4px; }
  pre { background: #f6f8fa; border-radius: 6px; padding: 1em; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 0.35em 0.9em; }
  th { background: #f7f7f7; }
  img { max-width: 100%; }
  hr { border: none; border-top: 2px solid #eee; margin: 1.5em 0; }
  .task-list-item { list-style: none; margin-left: -1.4em; }
  .math-block { text-align: center; margin: 1em 0; }
  .mermaid-diagram { text-align: center; margin: 1em 0; }
  .mermaid-error { color: #c0392b; }
  @media print {
    body { max-width: none; padding: 0; }
    pre, blockquote, table, .mermaid-diagram { break-inside: avoid; }
  }
`

export async function renderExportHtml(markdown: string, title: string): Promise<string> {
  const body = await renderMermaidBlocks(renderBodyHtml(markdown))
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${renderer.utils.escapeHtml(title)}</title>
<style>${hljsCss}</style>
<style>${EXPORT_CSS}</style>
</head>
<body>
${body}
</body>
</html>
`
}
