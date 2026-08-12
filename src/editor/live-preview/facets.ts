import { Facet, StateEffect } from '@codemirror/state'

export type ImageResolver = (src: string) => string

export const imageResolver = Facet.define<ImageResolver, ImageResolver>({
  combine: values => values[0] ?? ((src: string) => src),
})

/** Persist pasted/inserted image bytes and return the markdown src to insert (or null). */
export type ImageSaver = (data: Uint8Array, ext: string) => Promise<string | null>

export const imageSaver = Facet.define<ImageSaver, ImageSaver>({
  combine: values => values[0] ?? (async () => null),
})

export const uiTheme = Facet.define<'light' | 'dark', 'light' | 'dark'>({
  combine: values => values[0] ?? 'light',
})

/** Dispatch { effects: rebuildWidgets.of(null) } after facet reconfiguration. */
export const rebuildWidgets = StateEffect.define<null>()
