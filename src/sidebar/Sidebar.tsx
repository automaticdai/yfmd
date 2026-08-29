import type { FileEntry } from '../services/file-service'
import { t } from '../app/i18n'
import { clampPanelWidth } from '../app/settings'
import { FileTreePane } from './FileTreePane'
import { usePanelResize } from './usePanelResize'

interface Props {
  tree: FileEntry[] | null
  folderPath: string | null
  width: number
  onWidthChange(width: number): void
  selectedPath: string | null
  onSelect(path: string): void
  onOpenFile(path: string): void
  onNewFile(path: string): void
  onNewFolder(path: string): void
  onRenameRequest(path: string): void
  onDelete(path: string): void
}

/** The left panel — folder and file management only. */
export function Sidebar({ tree, folderPath, width, onWidthChange, selectedPath, onSelect, onOpenFile, onNewFile, onNewFolder, onRenameRequest, onDelete }: Props) {
  const { ref, startResize } = usePanelResize('right', onWidthChange)

  return (
    <aside className="sidebar side-panel" ref={ref} style={{ width: clampPanelWidth(width) }}>
      <div className="panel-header">{t('sidebar.files')}</div>
      <div className="sidebar-content">
        {folderPath && <div className="sidebar-folder" title={folderPath}>{folderPath}</div>}
        <FileTreePane tree={tree ?? []} folderPath={folderPath}
          selectedPath={selectedPath} onSelect={onSelect} onOpenFile={onOpenFile}
          onNewFile={onNewFile} onNewFolder={onNewFolder}
          onRenameRequest={onRenameRequest} onDelete={onDelete} />
      </div>
      <div
        className="panel-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('settings.sidebarWidth')}
        onMouseDown={startResize}
      />
    </aside>
  )
}
