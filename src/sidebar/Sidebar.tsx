import { type MouseEvent as ReactMouseEvent, useRef, useState } from 'react'
import type { FileEntry } from '../services/file-service'
import type { OutlineItem } from '../outline/outline'
import { t } from '../app/i18n'
import { clampSidebarWidth } from '../app/settings'
import { FileTreePane } from './FileTreePane'
import { OutlinePane } from './OutlinePane'

interface Props {
  tree: FileEntry[] | null
  folderPath: string | null
  outline: OutlineItem[]
  defaultTab?: 'files' | 'outline'
  width: number
  onWidthChange(width: number): void
  selectedPath: string | null
  onSelect(path: string): void
  onOpenFile(path: string): void
  onNewFile(path: string): void
  onNewFolder(path: string): void
  onRenameRequest(path: string): void
  onDelete(path: string): void
  onJump(pos: number): void
}

export function Sidebar({ tree, folderPath, outline, defaultTab, width, onWidthChange, selectedPath, onSelect, onOpenFile, onNewFile, onNewFolder, onRenameRequest, onDelete, onJump }: Props) {
  const [tab, setTab] = useState<'files' | 'outline'>(defaultTab ?? 'files')
  const asideRef = useRef<HTMLElement>(null)

  // Drag the right edge to resize. The width is written straight to the DOM
  // during the drag (no re-render per mousemove) and committed on release.
  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = asideRef.current?.offsetWidth ?? width
    const onMove = (ev: MouseEvent) => {
      if (asideRef.current) asideRef.current.style.width = `${clampSidebarWidth(startW + ev.clientX - startX)}px`
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('is-resizing')
      if (asideRef.current) onWidthChange(clampSidebarWidth(asideRef.current.offsetWidth))
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <aside className="sidebar" ref={asideRef} style={{ width: clampSidebarWidth(width) }}>
      <div className="sidebar-tabs">
        <button
          className={'sidebar-tab' + (tab === 'files' ? ' active' : '')}
          data-tab="files"
          onClick={() => setTab('files')}
        >{t('sidebar.files')}</button>
        <button
          className={'sidebar-tab' + (tab === 'outline' ? ' active' : '')}
          data-tab="outline"
          onClick={() => setTab('outline')}
        >{t('sidebar.outline')}</button>
      </div>
      <div className="sidebar-content">
        {tab === 'files' ? (
          <>
            {folderPath && <div className="sidebar-folder" title={folderPath}>{folderPath}</div>}
            <FileTreePane tree={tree ?? []} folderPath={folderPath}
              selectedPath={selectedPath} onSelect={onSelect} onOpenFile={onOpenFile}
              onNewFile={onNewFile} onNewFolder={onNewFolder}
              onRenameRequest={onRenameRequest} onDelete={onDelete} />
          </>
        ) : (
          <OutlinePane outline={outline} onJump={onJump} />
        )}
      </div>
      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('settings.sidebarWidth')}
        onMouseDown={startResize}
      />
    </aside>
  )
}
