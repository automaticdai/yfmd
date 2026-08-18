import { useEffect, useState } from 'react'
import licenseText from '../../LICENSE?raw'
import pkg from '../../package.json'
import { t } from './i18n'

interface Props { onClose(): void }

export function AboutDialog({ onClose }: Props) {
  const [version, setVersion] = useState(pkg.version)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    let cancelled = false
    void (async () => {
      if ('__TAURI_INTERNALS__' in window) {
        try {
          const { getVersion } = await import('@tauri-apps/api/app')
          const v = await getVersion()
          if (!cancelled && v) setVersion(v)
        } catch {
          // fallback to pkg.version
        }
      }
    })()
    return () => { window.removeEventListener('keydown', onKey); cancelled = true }
  }, [onClose])

  const releaseUrl = `https://github.com/automaticdai/yfmd/releases/tag/v${version}`

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="about-dialog">
        <h2>yfmd</h2>
        <p className="about-version">
          {t('about.version')}{' '}
          <a
            href={releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="about-link"
          >
            v{version}
          </a>
        </p>
        <p className="about-tagline">{t('about.tagline')}</p>
        <p className="about-github">
          <a
            href="https://github.com/automaticdai/yfmd"
            target="_blank"
            rel="noreferrer"
            className="about-link"
          >
            GitHub: automaticdai/yfmd
          </a>
        </p>
        <p className="about-copyright">Copyright © 2026 automaticdai</p>
        <details className="about-license">
          <summary>{t('about.license')} — MIT</summary>
          <pre>{licenseText}</pre>
        </details>
        <button className="about-close" onClick={onClose}>{t('about.close')}</button>
      </div>
    </div>
  )
}

