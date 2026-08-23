import TurndownService from 'turndown'

// Output tuned to this app's own markdown conventions (ATX headings, `-` bullets,
// fenced code blocks, `*`/`**` emphasis).
const converter = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
})

/** Convert an HTML fragment to Markdown. */
export function htmlToMarkdown(html: string): string {
  return converter.turndown(html)
}
