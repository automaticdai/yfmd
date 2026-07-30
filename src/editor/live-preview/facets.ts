import { Facet, StateEffect } from '@codemirror/state'

export type ImageResolver = (src: string) => string

export const imageResolver = Facet.define<ImageResolver, ImageResolver>({
  combine: values => values[0] ?? ((src: string) => src),
})

export const uiTheme = Facet.define<'light' | 'dark', 'light' | 'dark'>({
  combine: values => values[0] ?? 'light',
})

/** Dispatch { effects: rebuildWidgets.of(null) } after facet reconfiguration. */
export const rebuildWidgets = StateEffect.define<null>()
