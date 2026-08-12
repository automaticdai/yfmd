import { t } from './i18n'
import { readingMinutes, type DocStats } from './word-count'

interface Props { path: string | null; dirty: boolean; sourceMode: boolean; stats: DocStats }

export function StatusBar({ path, dirty, sourceMode, stats }: Props) {
  const name = path ? path.slice(path.lastIndexOf('/') + 1) : t('status.untitled')
  return (
    <div className="statusbar">
      <span className="file-name">
        {name}
        {dirty && <span className="dirty-dot" title={t('status.unsaved')}> ●</span>}
      </span>
      <span className="status-right">
        <span className="status-stats" title={t('status.readingTime', { n: readingMinutes(stats.words) })}>
          {t('status.words', { n: stats.words })} · {t('status.chars', { n: stats.chars })}
        </span>
        {sourceMode && <span className="source-badge">{t('status.source')}</span>}
      </span>
    </div>
  )
}
