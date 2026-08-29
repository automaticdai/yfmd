import { describe, expect, it } from 'vitest'
import { buildMenus, type MenuGroup, type MenuSub } from './MenuBar'

describe('MenuBar', () => {
  it('builds menus with recent files and table submenu in Format menu', () => {
    const menus: MenuGroup[] = buildMenus(['/path/to/doc.md'])
    expect(menus.map(m => m.title)).toEqual(['File', 'Edit', 'Format', 'View', 'Theme', 'Help'])

    const formatMenu = menus.find(m => m.title === 'Format')
    expect(formatMenu).toBeDefined()

    const tableSubmenu = formatMenu?.items.find(
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
    const formatMenu = menus.find(m => m.title === 'Format')!
    const actions = formatMenu.items
      .filter((item): item is { action: string; label: string } => 'action' in item)
      .map(item => item.action)

    // Quote is a standalone Format action, no longer nested inside Callout.
    expect(actions).toContain('quote')

    const calloutSubmenu = formatMenu.items.find(
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

  it('binds F9/F10 to the panels and F11 to Fullscreen Mode in the View menu', () => {
    const menus: MenuGroup[] = buildMenus([])
    const viewMenu = menus.find(m => m.title === 'View')!
    const byAction = (action: string) =>
      viewMenu.items.find(
        (item): item is { action: string; label: string; shortcut?: string } =>
          'action' in item && item.action === action,
      )

    expect(byAction('toggle-sidebar')?.shortcut).toBe('F9')
    expect(byAction('toggle-outline')?.shortcut).toBe('F10')
    expect(byAction('fullscreen')).toBeDefined()
    expect(byAction('fullscreen')?.shortcut).toBe('F11')
    // Typewriter Mode is menu-only now
    expect(byAction('typewriter-mode')).toBeDefined()
    expect(byAction('typewriter-mode')?.shortcut).toBeUndefined()
  })

  it('keeps history/clipboard/find in Edit and moves styling to Format', () => {
    const menus: MenuGroup[] = buildMenus([])
    const actionsOf = (title: string) =>
      menus.find(m => m.title === title)!.items
        .filter((item): item is { action: string; label: string } => 'action' in item)
        .map(item => item.action)

    const edit = actionsOf('Edit')
    expect(edit).toEqual(['undo', 'redo', 'copy', 'paste', 'paste-text-only', 'find'])
    expect(edit).not.toContain('bold')
    expect(edit).not.toContain('heading:1')

    const format = actionsOf('Format')
    for (const a of ['bold', 'italic', 'link', 'heading:1', 'quote', 'code-block', 'toc']) {
      expect(format).toContain(a)
    }
  })
})
