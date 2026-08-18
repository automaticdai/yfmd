import hljs from 'highlight.js'
import hljsCss from 'highlight.js/styles/github.css?raw'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import type { RenderRule } from 'markdown-it/lib/renderer.mjs'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import mermaid from 'mermaid'
import { stripFrontmatter } from '../editor/frontmatter'
import { ALERT_ICONS, ALERT_LABELS, type AlertKind } from '../editor/live-preview/inline-decorations'
import { EMOJI } from '../editor/markdown-extensions'
import { slugify } from '../outline/outline'

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

function markRule(state: StateInline, silent: boolean): boolean {
  if (!state.src.startsWith('==', state.pos)) return false
  const end = state.src.indexOf('==', state.pos + 2)
  if (end === -1) return false
  if (!silent) {
    state.push('mark_open', 'mark', 1)
    const text = state.push('text', '', 0)
    text.content = state.src.slice(state.pos + 2, end)
    state.push('mark_close', 'mark', -1)
  }
  state.pos = end + 2
  return true
}

function supRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== '^' || state.src[state.pos + 1] === '^') return false
  const end = state.src.indexOf('^', state.pos + 1)
  if (end === -1) return false
  if (!silent) {
    state.push('sup_open', 'sup', 1)
    const text = state.push('text', '', 0)
    text.content = state.src.slice(state.pos + 1, end)
    state.push('sup_close', 'sup', -1)
  }
  state.pos = end + 1
  return true
}

function subRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== '~' || state.src[state.pos + 1] === '~') return false
  const end = state.src.indexOf('~', state.pos + 1)
  if (end === -1) return false
  if (!silent) {
    state.push('sub_open', 'sub', 1)
    const text = state.push('text', '', 0)
    text.content = state.src.slice(state.pos + 1, end)
    state.push('sub_close', 'sub', -1)
  }
  state.pos = end + 1
  return true
}

function emojiRule(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== ':') return false
  const m = /^:([a-zA-Z0-9_+-]+):/.exec(state.src.slice(state.pos))
  if (!m || !EMOJI[m[1]]) return false
  if (!silent) {
    const text = state.push('text', '', 0)
    text.content = EMOJI[m[1]]
  }
  state.pos += m[0].length
  return true
}

function footnoteRefRule(state: StateInline, silent: boolean): boolean {
  if (!state.src.startsWith('[^', state.pos)) return false
  const end = state.src.indexOf(']', state.pos + 2)
  if (end === -1) return false
  const id = state.src.slice(state.pos + 2, end)
  if (!/^[\w-]+$/.test(id)) return false
  if (!silent) {
    const t = state.push('footnote_ref', '', 0)
    t.meta = { id }
  }
  state.pos = end + 1
  return true
}

function alertPlugin(md: MarkdownIt): void {
  md.core.ruler.after('block', 'github-alerts', state => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue
      let inlineIdx = -1
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_close') break
        if (tokens[j].type === 'inline') {
          inlineIdx = j
          break
        }
      }
      if (inlineIdx === -1) continue
      const inlineToken = tokens[inlineIdx]
      const firstText = inlineToken.content
      const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n|\s*)/i.exec(firstText)
      if (!match) continue
      const kind = match[1].toLowerCase() as AlertKind

      tokens[i].type = 'alert_open'
      tokens[i].tag = 'div'
      tokens[i].attrs = [['class', `markdown-alert markdown-alert-${kind}`]]

      let depth = 1
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_open' || tokens[j].type === 'alert_open') depth++
        if (tokens[j].type === 'blockquote_close') {
          depth--
          if (depth === 0) {
            tokens[j].type = 'alert_close'
            tokens[j].tag = 'div'
            break
          }
        }
      }

      inlineToken.content = firstText.slice(match[0].length)
      if (inlineToken.children?.length) {
        const firstChild = inlineToken.children[0]
        if (firstChild && firstChild.type === 'text') {
          firstChild.content = firstChild.content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n|\s*)/i, '')
        }
      }

      const titleToken = new state.Token('alert_title', 'p', 0)
      titleToken.content = kind
      tokens.splice(i + 1, 0, titleToken)
    }
  })

  md.renderer.rules.alert_open = (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options)
  md.renderer.rules.alert_close = (tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options)
  md.renderer.rules.alert_title = (tokens, idx) => {
    const kind = tokens[idx].content as AlertKind
    return `<p class="markdown-alert-title">${ALERT_ICONS[kind]}<span>${ALERT_LABELS[kind]}</span></p>\n`
  }
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
  md.use(alertPlugin)
  md.inline.ruler.after('escape', 'math_inline', mathInlineRule)
  md.block.ruler.after('fence', 'math_block', mathBlockRule)
  md.inline.ruler.after('backticks', 'mark', markRule)
  md.inline.ruler.after('mark', 'sup', supRule)
  md.inline.ruler.after('sup', 'sub', subRule)
  md.inline.ruler.after('sub', 'emoji', emojiRule)
  md.inline.ruler.after('emoji', 'footnote_ref', footnoteRefRule)
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
  const headingOpen: RenderRule = (tokens, idx, options, _env, self) => {
    const inline = tokens[idx + 1]
    const text = inline?.children?.map(c => c.content ?? '').join('') ?? ''
    const id = slugify(text)
    if (id) tokens[idx].attrSet('id', id)
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.heading_open = headingOpen
  md.renderer.rules.mark_open = () => '<mark>'
  md.renderer.rules.mark_close = () => '</mark>'
  md.renderer.rules.sup_open = () => '<sup>'
  md.renderer.rules.sup_close = () => '</sup>'
  md.renderer.rules.sub_open = () => '<sub>'
  md.renderer.rules.sub_close = () => '</sub>'
  md.renderer.rules.footnote_ref = (tokens, idx) => {
    const id = tokens[idx].meta.id as string
    return `<sup id="fnref:${id}"><a href="#fn:${id}">${id}</a></sup>`
  }
  return md
}

const renderer = createExportRenderer()

export function renderBodyHtml(markdown: string): string {
  return renderer.render(stripFrontmatter(markdown))
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
  .markdown-alert {
    padding: 0.5rem 1rem; margin: 1rem 0; color: inherit;
    border-left: 0.25em solid #d0d7de; border-radius: 4px;
  }
  .markdown-alert-note { border-left-color: #0969da; background-color: rgba(9, 105, 218, 0.08); }
  .markdown-alert-tip { border-left-color: #1a7f37; background-color: rgba(26, 127, 55, 0.08); }
  .markdown-alert-important { border-left-color: #8250df; background-color: rgba(130, 80, 223, 0.08); }
  .markdown-alert-warning { border-left-color: #9a6700; background-color: rgba(154, 103, 0, 0.08); }
  .markdown-alert-caution { border-left-color: #cf222e; background-color: rgba(207, 34, 46, 0.08); }
  .markdown-alert-title {
    display: flex; align-items: center; gap: 0.4em;
    font-weight: 600; font-size: 0.95em; margin: 0 0 0.4em 0;
  }
  .markdown-alert-note .markdown-alert-title { color: #0969da; }
  .markdown-alert-tip .markdown-alert-title { color: #1a7f37; }
  .markdown-alert-important .markdown-alert-title { color: #8250df; }
  .markdown-alert-warning .markdown-alert-title { color: #9a6700; }
  .markdown-alert-caution .markdown-alert-title { color: #cf222e; }
  .markdown-alert-title svg { fill: currentColor; }
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

export async function renderExportHtml(markdown: string, title: string, customCss = ''): Promise<string> {
  const body = await renderMermaidBlocks(renderBodyHtml(markdown))
  const content = customCss ? `<div id="write">\n${body}\n</div>` : body
  const customStyle = customCss ? `<style>${customCss}</style>\n` : ''
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${renderer.utils.escapeHtml(title)}</title>
<style>${hljsCss}</style>
<style>${EXPORT_CSS}</style>
${customStyle}</head>
<body>
${content}
</body>
</html>
`
}
