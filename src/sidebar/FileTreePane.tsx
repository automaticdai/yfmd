import { useEffect, useState, type MouseEvent } from 'react'
import { dirname, type FileEntry, isMarkdownFile } from '../services/file-service'
import { t } from '../app/i18n'

interface Props {
  tree: FileEntry[]
  folderPath: string | null
  selectedPath: string | null
  onSelect(path: string): void
  onOpenFile(path: string): void
  onLoadDir(path: string): void
  onNewFile(path: string): void
  onNewFolder(path: string): void
  onRenameRequest(path: string): void
  onDelete(path: string): void
}

function joinPath(dir: string, name: string): string {
  return dir === '/' ? '/' + name : dir + '/' + name
}

function uniqueName(base: string, siblings: FileEntry[]): string {
  if (!siblings.some(s => s.name === base)) return base
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''
  let i = 1
  while (siblings.some(s => s.name === `${stem}-${i}${ext}`)) i++
  return `${stem}-${i}${ext}`
}

interface Menu { x: number; y: number; path: string | null }

function findEntry(entries: FileEntry[], path: string): FileEntry | null {
  for (const entry of entries) {
    if (entry.path === path) return entry
    if (entry.children) {
      const found = findEntry(entry.children, path)
      if (found) return found
    }
  }
  return null
}

interface NodeProps {
  entry: FileEntry
  isOpen(entry: FileEntry): boolean
  selectedPath: string | null
  onToggle(path: string): void
  onSelect(path: string): void
  onOpenFile(path: string): void
  onContextMenu(e: MouseEvent, node: FileEntry): void
}

function Node({ entry, isOpen, selectedPath, onToggle, onSelect, onOpenFile, onContextMenu }: NodeProps) {
  const open = entry.isDir && isOpen(entry)
  const selected = entry.path === selectedPath

  if (entry.isDir) {
    return (
      <div className="tree-node">
        <button
          className={'tree-dir' + (selected ? ' selected' : '')}
          draggable
          onDragStart={e => {
            e.dataTransfer.setData('application/x-yfmd-path', entry.path)
            e.dataTransfer.setData('application/x-yfmd-kind', 'dir')
            e.dataTransfer.effectAllowed = 'copy'
          }}
          onClick={() => { onSelect(entry.path); onToggle(entry.path) }}
          onContextMenu={e => onContextMenu(e, entry)}
        >
          <span className="tree-arrow">{open ? '▾' : '▸'}</span> {entry.name}
        </button>
        {open && (
          <div className="tree-children">
            {(entry.children ?? []).map(child => (
              <Node key={child.path} entry={child} isOpen={isOpen} selectedPath={selectedPath}
                onToggle={onToggle} onSelect={onSelect} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const openable = isMarkdownFile(entry.name)
  return (
    <button
      className={'tree-file' + (openable ? '' : ' tree-dim') + (selected ? ' selected' : '')}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/x-yfmd-path', entry.path)
        e.dataTransfer.setData('application/x-yfmd-kind', 'file')
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => { onSelect(entry.path); if (openable) onOpenFile(entry.path) }}
      onContextMenu={e => onContextMenu(e, entry)}
      title={entry.path}
    >
      {entry.name}
    </button>
  )
}

export function FileTreePane({ tree, folderPath, selectedPath, onSelect, onOpenFile, onLoadDir, onNewFile, onNewFolder, onRenameRequest, onDelete }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  const isOpen = (entry: FileEntry) => entry.children !== undefined && !collapsed.has(entry.path)

  const onToggle = (path: string) => {
    const entry = findEntry(tree, path)
    if (!entry) return
    if (entry.children === undefined) {
      void onLoadDir(path)
      setCollapsed(prev => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
      return
    }
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const clampMenuPos = (clientX: number, clientY: number) => ({
    x: Math.max(4, Math.min(clientX, window.innerWidth - 180)),
    y: Math.max(4, Math.min(clientY, window.innerHeight - 160)),
  })

  const openNodeMenu = (e: MouseEvent, node: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    if (node.isDir && node.children === undefined) void onLoadDir(node.path)
    setMenu({ ...clampMenuPos(e.clientX, e.clientY), path: node.path })
  }

  const openRootMenu = (e: MouseEvent) => {
    if (!folderPath) return
    e.preventDefault()
    setMenu({ ...clampMenuPos(e.clientX, e.clientY), path: null })
  }

  const menuNode = menu?.path ? findEntry(tree, menu.path) : null
  const menuItems: { label: string; run: () => void }[] = []
  if (menu) {
    const isDir = menu.path === null || menuNode?.isDir === true
    const targetDir = menu.path === null ? folderPath! : menuNode?.isDir ? menuNode.path : menuNode ? dirname(menuNode.path) : folderPath!
    const siblings = menu.path === null ? tree : menuNode?.isDir ? (menuNode.children ?? []) : []
    if (isDir) {
      menuItems.push({ label: t('sidebar.newFile'), run: () => onNewFile(joinPath(targetDir, uniqueName('untitled.md', siblings))) })
      menuItems.push({ label: t('sidebar.newFolder'), run: () => onNewFolder(joinPath(targetDir, uniqueName('New Folder', siblings))) })
    }
    if (menuNode) {
      menuItems.push({ label: t('sidebar.rename'), run: () => onRenameRequest(menuNode.path) })
      menuItems.push({ label: t('sidebar.delete'), run: () => onDelete(menuNode.path) })
    }
  }

  return (
    <div className="file-tree" onContextMenu={openRootMenu}>
      {tree.length === 0 && <p className="sidebar-empty">{t('sidebar.openFolder')}</p>}
      {tree.map(entry => (
        <Node key={entry.path} entry={entry} isOpen={isOpen} selectedPath={selectedPath}
          onToggle={onToggle} onSelect={onSelect} onOpenFile={onOpenFile} onContextMenu={openNodeMenu} />
      ))}
      {menu && (
        <div className="context-menu" onMouseDown={e => e.stopPropagation()} style={{ left: menu.x, top: menu.y }}>
          {menuItems.map(item => (
            <button key={item.label} onClick={() => { item.run(); setMenu(null) }}>{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
