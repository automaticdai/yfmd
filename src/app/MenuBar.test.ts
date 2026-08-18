import { describe, expect, it } from 'vitest'
import { buildMenus, type MenuGroup, type MenuSub } from './MenuBar'

describe('MenuBar', () => {
  it('builds menus with recent files and table submenu in Edit menu', () => {
    const menus: MenuGroup[] = buildMenus(['/path/to/doc.md'])
    expect(menus.map(m => m.title)).toEqual(['File', 'Edit', 'View', 'Theme', 'Help'])

    const editMenu = menus.find(m => m.title === 'Edit')
    expect(editMenu).toBeDefined()

    const tableSubmenu = editMenu?.items.find(
      item => 'submenu' in item && item.label === 'Table',
    ) as MenuSub | undefined

    expect(tableSubmenu).toBeDefined()
    expect(tableSubmenu?.submenu).toBe(true)

    const actions = tableSubmenu?.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    expect(actions).toEqual([
      'table-creator',
      'table',
      'table-add-row',
      'table-del-row',
      'table-add-col',
      'table-del-col',
    ])

    const quoteSubmenu = editMenu?.items.find(
      item => 'submenu' in item && item.label === 'Quote / Callout',
    ) as MenuSub | undefined

    expect(quoteSubmenu).toBeDefined()
    expect(quoteSubmenu?.submenu).toBe(true)

    const quoteActions = quoteSubmenu?.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    expect(quoteActions).toEqual([
      'quote',
      'alert:note',
      'alert:tip',
      'alert:important',
      'alert:warning',
      'alert:caution',
    ])
  })
})
