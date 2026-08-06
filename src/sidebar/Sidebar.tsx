import { useState } from 'react'
import type { FileEntry } from '../services/file-service'
import type { OutlineItem } from '../outline/outline'
import { FileTreePane } from './FileTreePane'
import { OutlinePane } from './OutlinePane'

interface Props {
  tree: FileEntry[] | null
  folderPath: string | null
  outline: OutlineItem[]
  defaultTab?: 'files' | 'outline'
  onOpenFile(path: string): void
  onJump(pos: number): void
}

export function Sidebar({ tree, folderPath, outline, defaultTab, onOpenFile, onJump }: Props) {
  const [tab, setTab] = useState<'files' | 'outline'>(defaultTab ?? 'files')
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={'sidebar-tab' + (tab === 'files' ? ' active' : '')}
          data-tab="files"
          onClick={() => setTab('files')}
        >Files</button>
        <button
          className={'sidebar-tab' + (tab === 'outline' ? ' active' : '')}
          data-tab="outline"
          onClick={() => setTab('outline')}
        >Outline</button>
      </div>
      <div className="sidebar-content">
        {tab === 'files' ? (
          <>
            {folderPath && <div className="sidebar-folder" title={folderPath}>{folderPath}</div>}
            <FileTreePane tree={tree ?? []} onOpenFile={onOpenFile} />
          </>
        ) : (
          <OutlinePane outline={outline} onJump={onJump} />
        )}
      </div>
    </aside>
  )
}
