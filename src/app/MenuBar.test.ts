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
  })

  it('splits Quote into a top-level item and Callout into its own submenu', () => {
    const menus: MenuGroup[] = buildMenus([])
    const editMenu = menus.find(m => m.title === 'Edit')!
    const actions = editMenu.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    // Quote is a standalone Edit action, no longer nested inside Callout.
    expect(actions).toContain('quote')

    const calloutSubmenu = editMenu.items.find(
      item => 'submenu' in item && item.label === 'Callout',
    ) as MenuSub | undefined

    expect(calloutSubmenu).toBeDefined()
    expect(calloutSubmenu?.submenu).toBe(true)

    const calloutActions = calloutSubmenu?.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    expect(calloutActions).toEqual([
      'alert:note',
      'alert:tip',
      'alert:important',
      'alert:warning',
      'alert:caution',
    ])

    const calloutLabels = calloutSubmenu?.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.label)

    // Callout names are shown bare, without the (>[!NOTE]) syntax.
    expect(calloutLabels).toEqual(['Note', 'Tip', 'Important', 'Warning', 'Caution'])
  })

  it('includes Always on Top in the View menu', () => {
    const menus: MenuGroup[] = buildMenus([])
    const viewMenu = menus.find(m => m.title === 'View')!
    const actions = viewMenu.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    expect(actions).toContain('always-on-top')
  })

  it('binds F10 to the side panel and F11 to Fullscreen Mode in the View menu', () => {
    const menus: MenuGroup[] = buildMenus([])
    const viewMenu = menus.find(m => m.title === 'View')!
    const byAction = (action: string) =>
      viewMenu.items.find(
        (item): item is { action: string; label: string; shortcut?: string } =>
          'action' in item && item.action === action,
      )

    expect(byAction('toggle-sidebar')?.shortcut).toBe('F10')
    expect(byAction('fullscreen')).toBeDefined()
    expect(byAction('fullscreen')?.shortcut).toBe('F11')
  })

  it('includes Undo/Redo and clipboard actions in the Edit menu', () => {
    const menus: MenuGroup[] = buildMenus([])
    const editMenu = menus.find(m => m.title === 'Edit')!
    const actions = editMenu.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    expect(actions).toContain('undo')
    expect(actions).toContain('redo')
    expect(actions).toContain('copy')
    expect(actions).toContain('paste')
    expect(actions).toContain('paste-text-only')
  })
})
