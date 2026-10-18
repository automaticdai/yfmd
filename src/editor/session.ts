import { EditorState, type Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { codeLineNumbersField } from './code-line-numbers'
import { livePreviewExtensions } from './live-preview'
import { imageResolver, imageSaver, rebuildWidgets, syntaxOptions, uiTheme, type ImageSaver, type SyntaxOptions } from './live-preview/facets'
import {
  codeLineNumbersCompartment, imageSaverCompartment, livePreviewCompartment, readOnlyCompartment,
  readOnlyExtensions, resolverCompartment, syntaxCompartment, themeCompartment, writingModeCompartment,
} from './setup'
import { writingModeExtensions } from './writing-mode'

/** Runtime editor toggles that must survive a document swap. */
export interface EditorSession {
  sourceMode: boolean
  readOnly: boolean
  focusMode: boolean
  typewriterMode: boolean
  codeLineNumbers: boolean
  syntax: SyntaxOptions
  dark: boolean
  resolveImage(src: string): string
  saveImage: ImageSaver
  openExternal(url: string): void
}

/** Push every compartment from one place so a new toggle cannot be dropped on open. */
export function reapplyEditorSession(view: EditorView, session: EditorSession): void {
  view.dispatch({
    effects: [
      livePreviewCompartment.reconfigure(
        session.sourceMode ? [] : livePreviewExtensions({ openExternal: session.openExternal }),
      ),
      readOnlyCompartment.reconfigure(session.readOnly ? readOnlyExtensions() : []),
      writingModeCompartment.reconfigure(writingModeExtensions(session.focusMode, session.typewriterMode)),
      codeLineNumbersCompartment.reconfigure(session.codeLineNumbers ? codeLineNumbersField : []),
      syntaxCompartment.reconfigure(syntaxOptions.of(session.syntax)),
      themeCompartment.reconfigure(uiTheme.of(session.dark ? 'dark' : 'light')),
      resolverCompartment.reconfigure(imageResolver.of(session.resolveImage)),
      imageSaverCompartment.reconfigure(imageSaver.of(session.saveImage)),
      rebuildWidgets.of(null),
    ],
  })
}

/**
 * Replace the buffer without building a new extension set. History starts
 * empty because the state is new; compartments are then restored.
 */
export function replaceEditorDocument(
  view: EditorView, text: string, extensions: Extension, session: EditorSession,
): void {
  view.setState(EditorState.create({ doc: text, extensions }))
  reapplyEditorSession(view, session)
}
