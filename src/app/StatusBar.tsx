import { t } from './i18n'

interface Props { path: string | null; dirty: boolean; sourceMode: boolean }

export function StatusBar({ path, dirty, sourceMode }: Props) {
  const name = path ? path.slice(path.lastIndexOf('/') + 1) : t('status.untitled')
  return (
    <div className="statusbar">
      <span className="file-name">
        {name}
        {dirty && <span className="dirty-dot" title={t('status.unsaved')}> ●</span>}
      </span>
      {sourceMode && <span className="source-badge">{t('status.source')}</span>}
    </div>
  )
}
