import { useEffect, useState, type MouseEvent } from 'react'
import { dirname, type FileEntry, isMarkdownFile } from '../services/file-service'
import { t } from '../app/i18n'

interface Props {
  tree: FileEntry[]
  folderPath: string | null
  selectedPath: string | null
  onSelect(path: string): void
  onOpenFile(path: string): void
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

interface Menu { x: number; y: number; node: FileEntry | null }

interface NodeProps {
  entry: FileEntry
  selectedPath: string | null
  onSelect(path: string): void
  onOpenFile(path: string): void
  onContextMenu(e: MouseEvent, node: FileEntry): void
}

function Node({ entry, selectedPath, onSelect, onOpenFile, onContextMenu }: NodeProps) {
  const [collapsed, setCollapsed] = useState(false)
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
          onClick={() => { onSelect(entry.path); setCollapsed(c => !c) }}
          onContextMenu={e => onContextMenu(e, entry)}
        >
          <span className="tree-arrow">{collapsed ? '▸' : '▾'}</span> {entry.name}
        </button>
        {!collapsed && (
          <div className="tree-children">
            {(entry.children ?? []).map(child => (
              <Node key={child.path} entry={child} selectedPath={selectedPath}
                onSelect={onSelect} onOpenFile={onOpenFile} onContextMenu={onContextMenu} />
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

export function FileTreePane({ tree, folderPath, selectedPath, onSelect, onOpenFile, onNewFile, onNewFolder, onRenameRequest, onDelete }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null)

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
      menuItems.push({ label: t('sidebar.rename'), run: () => onRenameRequest(menu.node!.path) })
      menuItems.push({ label: t('sidebar.delete'), run: () => onDelete(menu.node!.path) })
    }
  }

  return (
    <div className="file-tree" onContextMenu={openRootMenu}>
      {tree.length === 0 && <p className="sidebar-empty">{t('sidebar.openFolder')}</p>}
      {tree.map(entry => (
        <Node key={entry.path} entry={entry} selectedPath={selectedPath}
          onSelect={onSelect} onOpenFile={onOpenFile} onContextMenu={openNodeMenu} />
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
