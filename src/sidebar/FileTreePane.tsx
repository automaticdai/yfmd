import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { dirname, type FileEntry, isMarkdownFile } from '../services/file-service'
import { t } from '../app/i18n'

interface Props {
  tree: FileEntry[]
  folderPath: string | null
  onOpenFile(path: string): void
  onNewFile(path: string): void
  onNewFolder(path: string): void
  onRename(oldPath: string, newPath: string): void
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

interface Renaming { path: string; value: string }
interface Menu { x: number; y: number; node: FileEntry | null }

interface NodeProps {
  entry: FileEntry
  renaming: Renaming | null
  onOpenFile(path: string): void
  onContextMenu(e: MouseEvent, node: FileEntry): void
  onRenameChange(value: string): void
  onRenameCommit(): void
  onRenameCancel(): void
}

function Node({ entry, renaming, onOpenFile, onContextMenu, onRenameChange, onRenameCommit, onRenameCancel }: NodeProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (renaming && renaming.path === entry.path) {
    return (
      <input
        className="tree-rename"
        autoFocus
        value={renaming.value}
        onFocus={e => e.target.select()}
        onChange={e => onRenameChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onRenameCommit()
          else if (e.key === 'Escape') onRenameCancel()
        }}
        onBlur={onRenameCommit}
      />
    )
  }

  if (entry.isDir) {
    return (
      <div className="tree-node">
        <button
          className="tree-dir"
          onClick={() => setCollapsed(c => !c)}
          onContextMenu={e => onContextMenu(e, entry)}
        >
          <span className="tree-arrow">{collapsed ? '▸' : '▾'}</span> {entry.name}
        </button>
        {!collapsed && (
          <div className="tree-children">
            {(entry.children ?? []).map(child => (
              <Node key={child.path} entry={child} renaming={renaming}
                onOpenFile={onOpenFile} onContextMenu={onContextMenu}
                onRenameChange={onRenameChange} onRenameCommit={onRenameCommit} onRenameCancel={onRenameCancel} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const openable = isMarkdownFile(entry.name)
  return (
    <button
      className={'tree-file' + (openable ? '' : ' tree-dim')}
      onClick={openable ? () => onOpenFile(entry.path) : undefined}
      onContextMenu={e => onContextMenu(e, entry)}
      title={entry.path}
    >
      {entry.name}
    </button>
  )
}

export function FileTreePane({ tree, folderPath, onOpenFile, onNewFile, onNewFolder, onRename, onDelete }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [renaming, setRenaming] = useState<Renaming | null>(null)
  const renameDone = useRef(false)

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])

  const openNodeMenu = (e: MouseEvent, node: FileEntry) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, node })
  }

  const openRootMenu = (e: MouseEvent) => {
    if (!folderPath) return
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, node: null })
  }

  const startRename = (path: string, value: string) => {
    renameDone.current = false
    setRenaming({ path, value })
  }

  const commitRename = () => {
    if (renameDone.current) return
    renameDone.current = true
    if (renaming) {
      const name = renaming.value.trim()
      const oldName = renaming.path.slice(renaming.path.lastIndexOf('/') + 1)
      if (name && name !== oldName) onRename(renaming.path, joinPath(dirname(renaming.path), name))
    }
    setRenaming(null)
  }

  const menuItems: { label: string; run: () => void }[] = []
  if (menu) {
    const isDir = menu.node === null || menu.node.isDir
    const targetDir = menu.node === null ? folderPath! : menu.node.isDir ? menu.node.path : dirname(menu.node.path)
    const siblings = menu.node === null ? tree : menu.node.isDir ? (menu.node.children ?? []) : []
    if (isDir) {
      menuItems.push({ label: t('sidebar.newFile'), run: () => onNewFile(joinPath(targetDir, uniqueName('untitled.md', siblings))) })
      menuItems.push({ label: t('sidebar.newFolder'), run: () => onNewFolder(joinPath(targetDir, uniqueName('New Folder', siblings))) })
    }
    if (menu.node !== null) {
      menuItems.push({ label: t('sidebar.rename'), run: () => startRename(menu.node!.path, menu.node!.name) })
      menuItems.push({ label: t('sidebar.delete'), run: () => onDelete(menu.node!.path) })
    }
  }

  return (
    <div className="file-tree" onContextMenu={openRootMenu}>
      {tree.length === 0 && <p className="sidebar-empty">{t('sidebar.openFolder')}</p>}
      {tree.map(entry => (
        <Node key={entry.path} entry={entry} renaming={renaming}
          onOpenFile={onOpenFile} onContextMenu={openNodeMenu}
          onRenameChange={v => setRenaming(r => (r ? { ...r, value: v } : r))}
          onRenameCommit={commitRename} onRenameCancel={() => setRenaming(null)} />
      ))}
      {menu && (
        <div className="context-menu" style={{ left: menu.x, top: menu.y }}>
          {menuItems.map(item => (
            <button key={item.label} onClick={() => { item.run(); setMenu(null) }}>{item.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
