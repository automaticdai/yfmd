import type { Extension } from '@codemirror/state'
import { inlineDecorations } from './inline-decorations'
import { linkClick } from './link-click'
import { tableAutoFormat } from './table'
import { taskListExtension } from './task-list'
import { widgetField } from './widget-field'

export interface LivePreviewOptions {
  openExternal(url: string): void
}

/** The full Typora-mode bundle. Source mode = reconfiguring the compartment to []. */
export function livePreviewExtensions(opts: LivePreviewOptions): Extension[] {
  return [inlineDecorations, taskListExtension, widgetField, tableAutoFormat, linkClick(opts.openExternal)]
}
