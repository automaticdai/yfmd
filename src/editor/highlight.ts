import { HighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/** Maps markdown tokens to CSS classes styled in styles/editor.css. */
export const mdHighlightStyle = HighlightStyle.define([
  { tag: tags.strong, class: 'tok-strong' },
  { tag: tags.emphasis, class: 'tok-em' },
  { tag: tags.strikethrough, class: 'tok-strike' },
  { tag: tags.monospace, class: 'tok-mono' },
  { tag: tags.link, class: 'tok-link' },
  { tag: tags.url, class: 'tok-url' },
  { tag: tags.heading, class: 'tok-heading' },
  { tag: tags.quote, class: 'tok-quote' },
  { tag: tags.comment, class: 'tok-comment' },
  { tag: tags.keyword, class: 'tok-kw' },
  { tag: tags.string, class: 'tok-str' },
  { tag: tags.number, class: 'tok-num' },
  { tag: tags.typeName, class: 'tok-type' },
  { tag: tags.function(tags.variableName), class: 'tok-fn' },
  { tag: tags.definition(tags.variableName), class: 'tok-def' },
  { tag: tags.propertyName, class: 'tok-prop' },
  { tag: tags.operator, class: 'tok-op' },
  { tag: tags.meta, class: 'tok-meta' },
])
