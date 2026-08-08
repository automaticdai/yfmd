import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { search, searchKeymap } from '@codemirror/search'
import { Compartment, type Extension, Prec } from '@codemirror/state'
import { EditorView, drawSelection, keymap } from '@codemirror/view'
import { headingCommand } from './block-commands'
import { insertLink, toggleBold, toggleInlineCode, toggleItalic, toggleStrikethrough } from './commands'
import { mdHighlightStyle } from './highlight'
import { livePreviewExtensions } from './live-preview'

export interface EditorOptions {
  onDocChanged(): void
  onToggleSource(): void
  openExternal(url: string): void
}

export const livePreviewCompartment = new Compartment()
export const resolverCompartment = new Compartment()
export const themeCompartment = new Compartment()

export function createExtensions(opts: EditorOptions): Extension[] {
  return [
    history(),
    drawSelection(),
    EditorView.lineWrapping,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(mdHighlightStyle),
    search({ top: true }),
    Prec.high(keymap.of([
      { key: 'Mod-/', run: () => (opts.onToggleSource(), true) },
      { key: 'Mod-b', run: toggleBold },
      { key: 'Mod-i', run: toggleItalic },
      { key: 'Mod-k', run: insertLink },
      { key: 'Mod-`', run: toggleInlineCode },
      { key: 'Mod-Shift-x', run: toggleStrikethrough },
      { key: 'Mod-1', run: headingCommand(1) },
      { key: 'Mod-2', run: headingCommand(2) },
      { key: 'Mod-3', run: headingCommand(3) },
      { key: 'Mod-0', run: headingCommand(0) },
    ])),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    livePreviewCompartment.of(livePreviewExtensions({ openExternal: opts.openExternal })),
    resolverCompartment.of([]),
    themeCompartment.of([]),
    EditorView.updateListener.of(u => {
      if (u.docChanged) opts.onDocChanged()
    }),
    EditorView.theme({
      '&': { height: '100%', fontSize: 'var(--editor-font-size, 16px)' },
      '.cm-scroller': { overflow: 'auto' },
      '&.cm-focused': { outline: 'none' },
    }),
  ]
}
