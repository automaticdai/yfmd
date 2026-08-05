import { useState } from 'react'
import { type FileEntry, isMarkdownFile } from '../services/file-service'

interface Props { tree: FileEntry[]; onOpenFile(path: string): void }

function Node({ entry, onOpenFile }: { entry: FileEntry; onOpenFile(path: string): void }) {
  const [collapsed, setCollapsed] = useState(false)
  if (entry.isDir) {
    return (
      <div className="tree-node">
        <button className="tree-dir" onClick={() => setCollapsed(c => !c)}>
          <span className="tree-arrow">{collapsed ? '▸' : '▾'}</span> {entry.name}
        </button>
        {!collapsed && (
          <div className="tree-children">
            {(entry.children ?? []).map(child => (
              <Node key={child.path} entry={child} onOpenFile={onOpenFile} />
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
      title={entry.path}
    >
      {entry.name}
    </button>
  )
}

export function FileTreePane({ tree, onOpenFile }: Props) {
  if (tree.length === 0) return <p className="sidebar-empty">Open a folder to browse files.</p>
  return (
    <div className="file-tree">
      {tree.map(entry => <Node key={entry.path} entry={entry} onOpenFile={onOpenFile} />)}
    </div>
  )
}
