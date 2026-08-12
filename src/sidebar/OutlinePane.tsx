import type { OutlineItem } from '../outline/outline'
import { t } from '../app/i18n'

interface Props { outline: OutlineItem[]; onJump(pos: number): void }

export function OutlinePane({ outline, onJump }: Props) {
  if (outline.length === 0) return <p className="sidebar-empty">{t('outline.empty')}</p>
  return (
    <div className="outline-list">
      {outline.map(item => (
        <button
          key={item.from}
          className="outline-item"
          data-level={item.level}
          style={{ paddingLeft: `${(item.level - 1) * 14 + 10}px` }}
          onClick={() => onJump(item.from)}
        >
          {item.text || t('outline.untitled')}
        </button>
      ))}
    </div>
  )
}
