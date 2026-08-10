import { describe, expect, it } from 'vitest'
import { findFrontmatter, stripFrontmatter } from './frontmatter'

const DOC = `---
title: 深度神经网络 (DNN) 在嵌入端的部署与优化
created: 2025-12-03 22:00:17
updated: 2026-03-16 01:29:22
tags:
  - dnn
  - edge-ai
---

# 正文
`

describe('findFrontmatter', () => {
  it('spans the opening fence through the end of the closing fence', () => {
    const r = findFrontmatter(DOC)!
    expect(r.from).toBe(0)
    expect(DOC.slice(r.from, r.to)).toBe(DOC.slice(0, DOC.indexOf('---\n\n# 正文') + 3))
    expect(DOC[r.to]).toBe('\n')
  })
  it('accepts the alternate "..." closing fence', () => {
    const r = findFrontmatter('---\ntitle: x\n...\nbody\n')!
    expect(r.to).toBe('---\ntitle: x\n...'.length)
  })
  it('accepts an empty block', () => {
    const r = findFrontmatter('---\n---\ntext\n')!
    expect(r.to).toBe(7)
  })
  it('tolerates trailing whitespace on the fences', () => {
    expect(findFrontmatter('---  \na: 1\n---\t\nx')).not.toBeNull()
  })
  it('tolerates CRLF line endings', () => {
    const r = findFrontmatter('---\r\na: 1\r\n---\r\nx')!
    expect(r.to).toBe('---\r\na: 1\r\n---'.length)
  })
  it('is nothing without a closing fence', () => {
    expect(findFrontmatter('---\ntitle: x\n\nbody text\n')).toBeNull()
  })
  it('is nothing when it does not start at the very first character', () => {
    expect(findFrontmatter('\n---\na: 1\n---\n')).toBeNull()
    expect(findFrontmatter('# Heading\n\n---\na: 1\n---\n')).toBeNull()
  })
  it('is nothing when the opening line is not exactly three dashes', () => {
    expect(findFrontmatter('----\na: 1\n----\n')).toBeNull()
    expect(findFrontmatter('--- yaml\na: 1\n---\n')).toBeNull()
  })
  it('closes on the first fence, not a later one', () => {
    const r = findFrontmatter('---\na: 1\n---\n\ntext\n\n---\n')!
    expect(r.to).toBe('---\na: 1\n---'.length)
  })
})

describe('stripFrontmatter', () => {
  it('removes the block and its line break', () => {
    expect(stripFrontmatter(DOC)).toBe('\n# 正文\n')
  })
  it('leaves a document without frontmatter untouched', () => {
    const doc = '# Title\n\nSome --- text\n'
    expect(stripFrontmatter(doc)).toBe(doc)
  })
  it('leaves an unterminated block untouched', () => {
    const doc = '---\ntitle: x\n\nbody\n'
    expect(stripFrontmatter(doc)).toBe(doc)
  })
  it('handles a document that is nothing but frontmatter', () => {
    expect(stripFrontmatter('---\na: 1\n---')).toBe('')
  })
})
