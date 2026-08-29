import type { OutlineItem } from '../outline/outline'
import { t } from '../app/i18n'
import { clampPanelWidth } from '../app/settings'
import { OutlinePane } from './OutlinePane'
import { usePanelResize } from './usePanelResize'

interface Props {
  outline: OutlineItem[]
  width: number
  onWidthChange(width: number): void
  onJump(pos: number): void
}

/** The right panel — a live document outline with jump-to-heading. */
export function OutlinePanel({ outline, width, onWidthChange, onJump }: Props) {
  const { ref, startResize } = usePanelResize('left', onWidthChange)

  return (
    <aside className="outline-panel side-panel" ref={ref} style={{ width: clampPanelWidth(width) }}>
      <div
        className="panel-resizer panel-resizer--left"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('settings.outlineWidth')}
        onMouseDown={startResize}
      />
      <div className="panel-header">{t('sidebar.outline')}</div>
      <div className="sidebar-content">
        <OutlinePane outline={outline} onJump={onJump} />
      </div>
    </aside>
  )
}
