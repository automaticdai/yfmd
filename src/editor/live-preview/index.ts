import type { Extension } from '@codemirror/state'
import { inlineDecorations } from './inline-decorations'
import { linkClick } from './link-click'
import { taskListExtension } from './task-list'

export interface LivePreviewOptions {
  openExternal(url: string): void
}

/** The full Typora-mode bundle. Source mode = reconfiguring the compartment to []. */
export function livePreviewExtensions(opts: LivePreviewOptions): Extension[] {
  return [inlineDecorations, taskListExtension, linkClick(opts.openExternal)]
}
