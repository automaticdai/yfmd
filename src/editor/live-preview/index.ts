import type { Extension } from '@codemirror/state'
import { inlineDecorations } from './inline-decorations'

/** The full Typora-mode bundle. Source mode = reconfiguring the compartment to []. */
export function livePreviewExtensions(): Extension[] {
  return [inlineDecorations]
}
