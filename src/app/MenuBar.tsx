import { useEffect, useRef, useState } from 'react'

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
      { action: 'toggle-sidebar', label: 'Toggle Sidebar' },
      { action: 'source-mode', label: 'Source Mode', shortcut: 'Ctrl+/' },
      { action: 'theme', label: 'Toggle Theme' },
    ],
  },
]

export function MenuBar({ onAction }: { onAction(action: string): void }) {
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
                  onClick={() => { setOpen(null); onAction(item.action) }}
                >
                  <span>{item.label}</span>
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
