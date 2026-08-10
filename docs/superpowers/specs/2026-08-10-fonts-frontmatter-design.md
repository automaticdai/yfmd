# Configurable Fonts & Frontmatter Support — Design

**Goal:** Let the user pick the editor body font and the code font from Settings,
and make YAML frontmatter parse and render as frontmatter instead of decaying
into a horizontal rule, a bullet list, and a bogus Setext heading.

## Part 1 — Configurable fonts

### Font catalogue (`src/app/fonts.ts`, new, pure TS)

```ts
export type FontKind = 'sans' | 'serif' | 'mono'
export interface FontOption { id: string; label: string; kind: FontKind; families: string[] }
export const BODY_FONTS: FontOption[]   // first entry id 'theme'   → "Follow theme"
export const CODE_FONTS: FontOption[]   // first entry id 'default' → "Default"
export function fontStack(id: string, list: FontOption[]): string | null
```

`fontStack` joins the option's `families` and appends a CJK fallback chain chosen
by `kind`, so CJK text never lands on an ugly system fallback:

| kind    | appended fallbacks                                                             |
| ------- | ------------------------------------------------------------------------------ |
| `sans`  | `Noto Sans CJK SC`, `Microsoft YaHei`, `WenQuanYi Micro Hei`, `Droid Sans Fallback`, `sans-serif` |
| `serif` | `Noto Serif CJK SC`, `Songti SC`, `SimSun`, `Droid Sans Fallback`, `serif`      |
| `mono`  | `Noto Sans Mono CJK SC`, `Droid Sans Fallback`, `monospace`                     |

`fontStack` returns `null` for the sentinel ids (`'theme'`, `'default'`) and for
any unknown id, meaning *set no CSS variable*.

Body list: Follow theme · System UI · Georgia · Palatino · Times New Roman ·
Verdana · Source Han Sans / Noto Sans CJK · Source Han Serif / Noto Serif CJK ·
PingFang SC · Microsoft YaHei · LXGW WenKai.

Code list: Default · Cascadia Code · Fira Code · JetBrains Mono · Consolas ·
Menlo / Monaco · Courier New · System monospace.

### Settings

`Settings` gains `bodyFont: string` (default `'theme'`) and `codeFont: string`
(default `'default'`), validated on load against the catalogue exactly as `theme`
already is — unknown value falls back to the default. Persisted in the existing
`yfmd-settings` localStorage blob; older blobs without the keys load as defaults.

`'theme'` is the body default so the per-theme `--editor-font` (Newsprint's serif)
keeps working. An explicit pick writes an inline custom property on
`document.documentElement`, which outranks the `[data-theme]` rule.

### Application

`App.tsx`'s settings effect additionally does:

```ts
const body = fontStack(settings.bodyFont, BODY_FONTS)
body === null ? root.style.removeProperty('--editor-font')
              : root.style.setProperty('--editor-font', body)
// same for --code-font / CODE_FONTS
```

`editor.css` replaces its four hardcoded monospace stacks
(`.tok-mono, .cm-inline-code`, `.cm-codeblock-line`, `.cm-table-line`, and the new
frontmatter box) with `var(--code-font, <current stack>)`. `.cm-editor .cm-scroller`
already reads `var(--editor-font)` and is unchanged.

App chrome (menu bar, sidebar, status bar, dialogs) stays on the system font.

### Settings dialog

Two `<select>` rows under Theme (`data-setting="bodyFont"` / `"codeFont"`), each
`<option>` rendered in its own stack, followed by one sample row
`The quick brown fox · 深度神经网络 0123` shown in the live selection — body sample
in `--editor-font`, code sample in `--code-font`.

No font-availability detection: `document.fonts.check` is unreliable for local
families and the canvas-measurement alternative is a cross-platform hack. The
sample row shows the user what they will actually get.

## Part 2 — Frontmatter

### The bug

Nothing in the pipeline knows frontmatter exists. For

```
---
title: 深度神经网络 (DNN) 在嵌入端的部署与优化
tags:
  - dnn
---
```

lezer-markdown parses the opening `---` as a `HorizontalRule` (replaced by an
`<hr>` widget), `  - dnn` as a `BulletList`, and `tags:` + closing `---` as a
`SetextHeading2` — which also puts a phantom "tags:" entry in the outline pane.

### Range scanner (`src/editor/frontmatter.ts`, new)

```ts
export interface FrontmatterRange { from: number; to: number }
export function findFrontmatter(text: string): FrontmatterRange | null
export function frontmatterRange(state: EditorState): FrontmatterRange | null
export function insideFrontmatter(r: FrontmatterRange | null, from: number, to: number): boolean
export function stripFrontmatter(text: string): string
```

`findFrontmatter` requires `---` (trailing whitespace allowed) as the very first
line and returns the range through the first following `---` or `...` line.
**No closing fence → no frontmatter**, so typing `---` at the top of a document
does not swallow everything below it while the user is still typing.

A lezer block parser would put the construct in the syntax tree, which is the
tidier place for it, but it cannot get there: a block parser can only look one
line ahead (`peekLine`), and scanning further means consuming lines it has no way
to give back if the closing fence never arrives. Scanning the text keeps the
"needs a closing fence" rule and leaves incremental parsing untouched.

`frontmatterRange` reads at most the first 8 KB of the document — truncation can
only hide a closing fence, never invent one — so a keystroke never rescans a large
file.

Accepted ambiguity: a document that legitimately opens with a thematic break, text,
and a Setext underline now reads as frontmatter. Typora, Obsidian and Jekyll all
behave this way.

### Rendering

Three consumers that walk the syntax tree skip any node lying wholly inside the
range — `buildInlineDecorations`, `buildWidgetDecorations` (kills the `<hr>`
widget) and `extractOutline` (kills the phantom "tags:" entry):

```ts
if (insideFrontmatter(frontmatter, node.from, node.to)) return false
```

`buildInlineDecorations` then adds the box itself, one line decoration per line
with `cm-frontmatter-first` / `-last` on the edges for the rounded corners.

Syntax highlighting is driven off the tree independently of these consumers, so
`.cm-editor .cm-frontmatter-line span` resets colour and weight inside the box —
without it a timestamp like `22:00:17` picks up emoji-shortcode colouring.

`editor.css` styles `.cm-frontmatter-line` as a `--code-bg` block in
`var(--code-font)` at 0.9em, `--fg-muted`, padded, with the first and last lines
carrying the rounded corners. Source mode (`Mod-/`) drops the decorations and shows
plain text, consistent with every other live-preview construct.

### Export

`renderBodyHtml` passes its input through `stripFrontmatter` first, so exported
HTML and PDF contain no metadata. The document title keeps coming from the filename.
`stripFrontmatter` is a pure string function sharing the parser's rules (opening
`---` at offset 0, closing `---` or `...`, CRLF tolerated); no match returns the
input unchanged.

Exported HTML keeps its own fixed font stacks — the export stylesheet is
standalone and takes no settings. Out of scope.

## Testing

**Unit**

- `fonts.test.ts` — stack assembly, CJK chain selected by `kind`, sentinel and
  unknown ids return `null`.
- `settings.test.ts` — `bodyFont`/`codeFont` defaults, round-trip, invalid id →
  default, legacy blob without the keys.
- `frontmatter.test.ts` — the example above yields the expected range; unterminated
  block is not frontmatter; a block not at offset 0 is not frontmatter; `...` closer;
  CRLF; empty block; `stripFrontmatter` for each case.
- `inline-decorations.test.ts` — frontmatter lines get `.cm-frontmatter-line` with
  the edge classes, and no markdown syntax is hidden inside the block.
- `widget-field.test.ts` — no HR widget for the fences, but one further down the
  document still renders.
- `outline.test.ts` — the phantom Setext heading is gone.
- `render-html.test.ts` — frontmatter absent from rendered HTML; a document
  without frontmatter is unchanged.

**E2E** (`e2e/`)

- Change both fonts in Settings; assert the computed `font-family` of
  `.cm-scroller` and of a code line.
- Type the example document; assert `.cm-frontmatter-line` appears and
  `.cm-hr-widget` does not.
