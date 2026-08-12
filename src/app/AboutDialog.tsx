import { useEffect, useState } from 'react'
import licenseText from '../../LICENSE?raw'
import { t } from './i18n'

interface Props { onClose(): void }

export function AboutDialog({ onClose }: Props) {
  const [version, setVersion] = useState('…')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    let cancelled = false
    void (async () => {
      let v = 'dev'
      if ('__TAURI_INTERNALS__' in window) {
        const { getVersion } = await import('@tauri-apps/api/app')
        v = await getVersion()
      }
      if (!cancelled) setVersion(v)
    })()
    return () => { window.removeEventListener('keydown', onKey); cancelled = true }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="about-dialog">
        <h2>yfmd</h2>
        <p className="about-version">{t('about.version')} {version}</p>
        <p className="about-tagline">{t('about.tagline')}</p>
        <details className="about-license">
          <summary>{t('about.license')} — MIT</summary>
          <pre>{licenseText}</pre>
        </details>
        <button className="about-close" onClick={onClose}>{t('about.close')}</button>
      </div>
    </div>
  )
}
