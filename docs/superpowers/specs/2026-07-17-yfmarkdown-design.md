# yfmarkdown — Typora-style Markdown Editor: Design Spec

**Date:** 2026-07-17
**Status:** Approved by user

## Purpose

A desktop markdown editor/viewer modeled on Typora: a single-pane WYSIWYG
editing experience where markdown renders in place as you type, and the raw
syntax of whatever the cursor touches is revealed for editing. The file on
disk is always exactly what the user typed — the app never reformats or
normalizes the markdown.

## Platform & Stack

- **Shell:** Tauri 2 desktop app. Built and run on Linux (WSL2, displayed via
  WSLg). Windows build possible later; not in scope for v1.
- **Frontend:** TypeScript + React + Vite.
- **Editor engine:** CodeMirror 6 with the Lezer markdown parser and a custom
  "live preview" decoration layer (Obsidian-style architecture).
- **Rust side (thin):** native open/save dialogs, file read/write, folder
  listing. No business logic in Rust.

### Architectural ground rule

The markdown text (the CodeMirror document) is the single source of truth.
All rendering — hidden syntax markers, widgets, tables — is presentation
layered on top via decorations. Saving writes the document text verbatim.

## Editor Core (the Typora behavior)

### Inline elements

`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, `[link](url)`:

- Rendered styled with syntax markers hidden when the cursor/selection does
  not touch the element's syntax node.
- When the cursor or selection intersects the element, the raw markers
  reappear for editing.
- Links render as the link text, styled; Ctrl+Click opens the URL in the
  system browser.

### Block elements

- **Headings:** sized/weighted per level; leading `#` markers hidden unless
  the cursor is on that line.
- **Blockquotes:** styled left border; `>` markers hidden unless cursor is on
  the line.
- **Lists:** bullets/numbers styled; task-list checkboxes render as real,
  clickable checkboxes that toggle `[ ]`/`[x]` in the source.
- **Horizontal rules:** render as a line unless cursor is on it.
- **Fenced code blocks:** syntax-highlighted via CodeMirror nested language
  parsing; fence lines de-emphasized, block styled with background.

### Widgets (rendered replacements, click to edit source)

- **Images:** `![alt](path)` renders the image inline. Relative paths resolve
  against the document's directory (through the Tauri asset protocol).
  Missing/broken images show a placeholder with the path.
- **Math:** inline `$...$` and block `$$...$$` render via KaTeX. Cursor
  inside → raw source shown; outside → rendered output.
- **Mermaid:** ` ```mermaid ` fenced blocks render as diagrams when the
  cursor is outside the block; inside, the source shows with highlighting.
- **Render errors** (bad KaTeX/Mermaid syntax) show an inline error box in
  place of the widget — never a crash, never blocking editing.

### Tables

- Cursor outside the table: rendered as a real HTML table widget.
- Cursor inside: raw markdown source shown, auto-aligned (padded pipes) for
  readability. Cell-by-cell WYSIWYG editing is explicitly out of scope for
  v1 (accepted trade-off of the CodeMirror architecture).

### Source mode

Ctrl+/ toggles all live-preview rendering off (pure markdown with syntax
highlighting) and back on.

## App Shell

- **Single document** open at a time (like Typora — no tab bar).
- **Sidebar** with two tabs:
  - **Files:** open a folder, browse its tree, click a markdown file to open
    it. Non-markdown files listed but dimmed/unopenable.
  - **Outline:** heading hierarchy extracted from the editor's syntax tree;
    click to scroll to that heading. Updates live as the document changes.
- **Dirty tracking:** modified indicator in the title; prompt to
  save/discard/cancel before switching files, opening another file, or
  closing the window.
- **Menus/commands & shortcuts:**
  - File: New (Ctrl+N), Open File (Ctrl+O), Open Folder, Save (Ctrl+S),
    Save As (Ctrl+Shift+S), Export.
  - Edit/Format: Bold (Ctrl+B), Italic (Ctrl+I), Insert Link (Ctrl+K),
    inline code, strikethrough; Find/Replace (Ctrl+F / Ctrl+H) using
    CodeMirror's search panel, restyled to match the app.
  - View: toggle sidebar, source mode (Ctrl+/), theme toggle.
- **Themes:** light and dark, CSS-variable based, defaulting to the system
  preference with a manual toggle. Typography modeled on Typora's default
  theme (comfortable measure, generous line height, serif-optional headings).

## Export

A second, render-oriented pipeline — markdown-it with GFM, KaTeX, and
Mermaid — independent of the editor's Lezer parser:

- **HTML export:** standalone `.html` with inlined CSS, math rendered to
  KaTeX HTML, Mermaid rendered to inline SVG. No external network
  dependencies in the output.
- **PDF export:** the exported HTML opens in a print-styled window and the
  system print dialog is invoked (print-to-PDF). Direct PDF generation is a
  possible later enhancement, not v1.

## Error Handling

- File read/write failures surface as non-blocking toast/dialog messages
  with the OS error; never silent failure.
- Unsaved-changes guard covers window close, file switch, and folder open.
- Widget render failures degrade to inline error boxes (see Editor Core).
- External modification of the open file is out of scope for v1 (no file
  watcher); last-writer-wins on save.

## Testing

- The frontend depends on a small `FileService` interface; the Tauri
  implementation is swapped for an in-memory/browser one in dev and tests,
  so the full editor runs in a plain browser.
- **Playwright end-to-end tests** against the Vite dev server cover the core
  behaviors: typing markdown and seeing it render, syntax reveal at cursor,
  checkbox toggling, table render/edit switching, math/mermaid widgets,
  theme toggle, outline navigation.
- Unit tests for pure logic: decoration range computation, outline
  extraction, table alignment formatting.
- Rust side stays thin enough that Tauri command tests are minimal.

## Out of Scope for v1

- Multiple windows/tabs; split view.
- Cell-by-cell WYSIWYG table editing.
- File watching / external-change reload.
- Image paste-from-clipboard with auto-save-to-folder.
- Custom user themes/CSS; plugin system.
- Windows/macOS packaging.
- Spellcheck, word count, focus/typewriter modes.
