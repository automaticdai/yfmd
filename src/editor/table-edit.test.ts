import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  addTableColSpec, addTableRowSpec, removeTableColSpec, removeTableRowSpec, tableEnterSpec, tableNavSpec,
} from './table-edit'

const EXT = [markdown({ base: markdownLanguage })]

function state(doc: string, cursor: number): EditorState {
  return EditorState.create({ doc, selection: EditorSelection.cursor(cursor), extensions: EXT })
}

const T = '| a | b |\n| - | - |\n| c | d |'

describe('tableNavSpec', () => {
  it('moves right to the next cell', () => {
    const next = state(T, 2).update(tableNavSpec(state(T, 2), 1)!).state
    expect(next.selection.main.head).toBe(6)
  })
  it('moves left to the previous cell', () => {
    const next = state(T, 6).update(tableNavSpec(state(T, 6), -1)!).state
    expect(next.selection.main.head).toBe(2)
  })
  it('does nothing outside a table', () => {
    expect(tableNavSpec(state('hello', 2), 1)).toBeNull()
  })
})

describe('add/remove rows and columns', () => {
  it('adds a row after the header', () => {
    const next = state(T, 2).update(addTableRowSpec(state(T, 2))!).state
    expect(next.doc.toString()).toBe('| a   | b   |\n| --- | --- |\n|     |     |\n| c   | d   |')
  })
  it('removes a data row', () => {
    const next = state(T, 22).update(removeTableRowSpec(state(T, 22))!).state
    expect(next.doc.toString()).toBe('| a   | b   |\n| --- | --- |')
  })
  it('adds a column', () => {
    const next = state(T, 2).update(addTableColSpec(state(T, 2))!).state
    expect(next.doc.toString()).toBe('| a   | b   |     |\n| --- | --- | --- |\n| c   | d   |     |')
  })
  it('removes a column', () => {
    const next = state(T, 2).update(removeTableColSpec(state(T, 2))!).state
    expect(next.doc.toString()).toBe('| b   |\n| --- |\n| d   |')
  })
  it('adds a row on Enter at the end of the last row', () => {
    const next = state(T, T.length).update(tableEnterSpec(state(T, T.length))!).state
    expect(next.doc.toString()).toBe('| a   | b   |\n| --- | --- |\n| c   | d   |\n|     |     |')
  })
})
