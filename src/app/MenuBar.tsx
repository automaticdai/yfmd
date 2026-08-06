import { useEffect, useRef, useState } from 'react'
import { THEMES } from './settings'

export interface MenuAction { action: string; label: string; shortcut?: string }
export interface MenuGroup { title: string; items: MenuAction[] }

export const MENUS: MenuGroup[] = [
  {
    title: 'File',
    items: [
      { action: 'new', label: 'New', shortcut: 'Ctrl+N' },
      { action: 'open-file', label: 'Open File…', shortcut: 'Ctrl+O' },
      { action: 'open-folder', label: 'Open Folder…' },
      { action: 'save', label: 'Save', shortcut: 'Ctrl+S' },
      { action: 'save-as', label: 'Save As…', shortcut: 'Ctrl+Shift+S' },
      { action: 'export-html', label: 'Export HTML…' },
      { action: 'export-pdf', label: 'Export PDF…' },
      { action: 'settings', label: 'Settings…', shortcut: 'Ctrl+,' },
      { action: 'quit', label: 'Quit', shortcut: 'Ctrl+Q' },
    ],
  },
  {
    title: 'Edit',
    items: [
      { action: 'bold', label: 'Bold', shortcut: 'Ctrl+B' },
      { action: 'italic', label: 'Italic', shortcut: 'Ctrl+I' },
      { action: 'strike', label: 'Strikethrough', shortcut: 'Ctrl+Shift+X' },
      { action: 'code', label: 'Inline Code', shortcut: 'Ctrl+`' },
      { action: 'link', label: 'Insert Link', shortcut: 'Ctrl+K' },
      { action: 'find', label: 'Find / Replace', shortcut: 'Ctrl+F' },
    ],
  },
  {
    title: 'View',
    items: [
      { action: 'toggle-sidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+Shift+L' },
      { action: 'source-mode', label: 'Source Mode', shortcut: 'Ctrl+/' },
    ],
  },
  {
    title: 'Theme',
    items: THEMES.map(t => ({ action: `theme:${t.id}`, label: t.label })),
  },
]

interface MenuBarProps {
  onAction(action: string): void
  checkedActions?: Set<string>
}

export function MenuBar({ onAction, checkedActions }: MenuBarProps) {
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="menubar" ref={barRef}>
      {MENUS.map(menu => (
        <div className="menu" key={menu.title}>
          <button
            className={'menu-title' + (open === menu.title ? ' open' : '')}
            onClick={() => setOpen(open === menu.title ? null : menu.title)}
          >
            {menu.title}
          </button>
          {open === menu.title && (
            <div className="menu-items">
              {menu.items.map(item => (
                <button
                  key={item.action}
                  data-action={item.action}
                  className={checkedActions?.has(item.action) ? 'checked' : undefined}
                  onClick={() => { setOpen(null); onAction(item.action) }}
                >
                  <span>{checkedActions?.has(item.action) ? '✓ ' : ''}{item.label}</span>
                  {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
