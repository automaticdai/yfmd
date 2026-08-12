import { useEffect, useRef, useState } from 'react'
import { t } from './i18n'
import { THEMES } from './settings'

export interface MenuAction { action: string; label: string; shortcut?: string; title?: string }
export interface MenuSeparator { separator: true }
export interface MenuSub { submenu: true; label: string; items: MenuItem[] }
export type MenuItem = MenuAction | MenuSeparator | MenuSub
export interface MenuGroup { title: string; items: MenuItem[] }

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function buildMenus(recent: string[]): MenuGroup[] {
  const fileItems: MenuItem[] = [
    { action: 'new', label: t('file.new'), shortcut: 'Ctrl+N' },
    { action: 'open-file', label: t('file.openFile'), shortcut: 'Ctrl+O' },
    { action: 'open-folder', label: t('file.openFolder') },
    { action: 'save', label: t('file.save'), shortcut: 'Ctrl+S' },
    { action: 'save-as', label: t('file.saveAs'), shortcut: 'Ctrl+Shift+S' },
    { action: 'export-html', label: t('file.exportHtml') },
    { action: 'export-pdf', label: t('file.exportPdf') },
  ]
  if (recent.length > 0) {
    fileItems.push({ separator: true })
    fileItems.push({
      submenu: true,
      label: t('file.recent'),
      items: [
        ...recent.map(path => ({ action: `open-recent://${path}`, label: basename(path), title: path })),
        { separator: true },
        { action: 'clear-recent', label: t('file.clearRecent') },
      ],
    })
  }
  fileItems.push(
    { separator: true },
    { action: 'settings', label: t('file.settings'), shortcut: 'Ctrl+,' },
    { action: 'quit', label: t('file.quit'), shortcut: 'Ctrl+Q' },
  )

  return [
    { title: t('menu.file'), items: fileItems },
    {
      title: t('menu.edit'),
      items: [
        { action: 'bold', label: t('edit.bold'), shortcut: 'Ctrl+B' },
        { action: 'italic', label: t('edit.italic'), shortcut: 'Ctrl+I' },
        { action: 'strike', label: t('edit.strikethrough'), shortcut: 'Ctrl+Shift+X' },
        { action: 'code', label: t('edit.inlineCode'), shortcut: 'Ctrl+`' },
        { action: 'link', label: t('edit.insertLink'), shortcut: 'Ctrl+K' },
        { action: 'insert-image', label: t('edit.insertImage') },
        { separator: true },
        { action: 'heading:1', label: t('edit.heading1'), shortcut: 'Ctrl+1' },
        { action: 'heading:2', label: t('edit.heading2'), shortcut: 'Ctrl+2' },
        { action: 'heading:3', label: t('edit.heading3'), shortcut: 'Ctrl+3' },
        { action: 'heading:0', label: t('edit.paragraph'), shortcut: 'Ctrl+0' },
        { action: 'quote', label: t('edit.quote') },
        { separator: true },
        { action: 'list-unordered', label: t('edit.bulletedList') },
        { action: 'list-ordered', label: t('edit.numberedList') },
        { separator: true },
        { action: 'table', label: t('edit.table') },
        { action: 'table-add-row', label: t('edit.tableAddRow') },
        { action: 'table-del-row', label: t('edit.tableDelRow') },
        { action: 'table-add-col', label: t('edit.tableAddCol') },
        { action: 'table-del-col', label: t('edit.tableDelCol') },
        { action: 'code-block', label: t('edit.codeBlock') },
        { action: 'math-block', label: t('edit.mathBlock') },
        { action: 'hr', label: t('edit.horizontalRule') },
        { separator: true },
        { action: 'find', label: t('edit.findReplace'), shortcut: 'Ctrl+F' },
      ],
    },
    {
      title: t('menu.view'),
      items: [
        { action: 'toggle-sidebar', label: t('view.toggleSidebar'), shortcut: 'Ctrl+Shift+L' },
        { action: 'source-mode', label: t('view.sourceMode'), shortcut: 'Ctrl+/' },
        { action: 'focus-mode', label: t('view.focusMode') },
        { action: 'typewriter-mode', label: t('view.typewriterMode') },
        { action: 'line-numbers', label: t('view.lineNumbers') },
      ],
    },
    {
      title: t('menu.theme'),
      items: THEMES.map(theme => ({ action: `theme:${theme.id}`, label: theme.label })),
    },
    {
      title: t('menu.help'),
      items: [{ action: 'about', label: t('help.about') }],
    },
  ]
}

interface MenuBarProps {
  onAction(action: string): void
  checkedActions?: Set<string>
  recent: string[]
}

function MenuItems({ items, onSelect, checkedActions }: {
  items: MenuItem[]
  onSelect(action: string): void
  checkedActions?: Set<string>
}) {
  return (
    <>
      {items.map((item, i) => {
        if ('separator' in item) return <div className="menu-separator" key={i} />
        if ('submenu' in item) {
          return (
            <div className="menu-sub" key={item.label}>
              <button className="menu-sub-title">
                <span>{item.label}</span>
                <span className="sub-arrow">▸</span>
              </button>
              <div className="menu-items menu-sub-items">
                <MenuItems items={item.items} onSelect={onSelect} checkedActions={checkedActions} />
              </div>
            </div>
          )
        }
        return (
          <button
            key={item.action}
            data-action={item.action}
            className={checkedActions?.has(item.action) ? 'checked' : undefined}
            title={item.title}
            onClick={() => onSelect(item.action)}
          >
            <span>{checkedActions?.has(item.action) ? '✓ ' : ''}{item.label}</span>
            {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
          </button>
        )
      })}
    </>
  )
}

export function MenuBar({ onAction, checkedActions, recent }: MenuBarProps) {
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  const menus = buildMenus(recent)
  const select = (action: string) => { setOpen(null); onAction(action) }

  return (
    <div className="menubar" ref={barRef}>
      {menus.map(menu => (
        <div className="menu" key={menu.title}>
          <button
            className={'menu-title' + (open === menu.title ? ' open' : '')}
            onClick={() => setOpen(open === menu.title ? null : menu.title)}
          >
            {menu.title}
          </button>
          {open === menu.title && (
            <div className="menu-items">
              <MenuItems items={menu.items} onSelect={select} checkedActions={checkedActions} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
