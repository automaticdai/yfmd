import { useEffect } from 'react'
import { type MessageKey, t } from './i18n'

interface Props { onClose(): void }

interface Section { title: MessageKey; rows: [MessageKey, string][] }

const SECTIONS: Section[] = [
  {
    title: 'menu.file',
    rows: [
      ['file.new', 'Ctrl+N'],
      ['file.openFile', 'Ctrl+O'],
      ['file.save', 'Ctrl+S'],
      ['file.saveAs', 'Ctrl+Shift+S'],
      ['file.settings', 'Ctrl+,'],
      ['file.quit', 'Ctrl+Q'],
    ],
  },
  {
    title: 'menu.edit',
    rows: [
      ['edit.undo', 'Ctrl+Z'],
      ['edit.redo', 'Ctrl+Y'],
      ['edit.copy', 'Ctrl+C'],
      ['edit.paste', 'Ctrl+V'],
      ['edit.pasteTextOnly', 'Ctrl+Shift+V'],
      ['edit.findReplace', 'F4'],
      ['sidebar.rename', 'F2'],
    ],
  },
  {
    title: 'menu.format',
    rows: [
      ['edit.bold', 'Ctrl+B'],
      ['edit.italic', 'Ctrl+I'],
      ['edit.strikethrough', 'Ctrl+Shift+X'],
      ['edit.inlineCode', 'Ctrl+`'],
      ['edit.insertLink', 'Ctrl+K'],
      ['edit.heading1', 'Ctrl+1'],
      ['edit.heading2', 'Ctrl+2'],
      ['edit.heading3', 'Ctrl+3'],
      ['edit.paragraph', 'Ctrl+0'],
    ],
  },
  {
    title: 'menu.view',
    rows: [
      ['view.toggleSidebar', 'F9'],
      ['view.outline', 'F10'],
      ['view.fullscreen', 'F11'],
      ['view.sourceMode', 'Ctrl+/'],
      ['view.focusMode', 'F8'],
      ['help.about', 'F1'],
    ],
  },
]

/** Render "Ctrl+Shift+S" as separate <kbd> chips. */
function Keys({ combo }: { combo: string }) {
  const parts = combo.split('+')
  return (
    <span className="shortcut-keys">
      {parts.map((k, i) => (
        <kbd key={i}>{k}</kbd>
      ))}
    </span>
  )
}

export function ShortcutsDialog({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="shortcuts-dialog" role="dialog" aria-label={t('help.shortcuts')}>
        <h2>{t('help.shortcuts')}</h2>
        <div className="shortcuts-body">
          {SECTIONS.map(section => (
            <section className="shortcuts-section" key={section.title}>
              <h3>{t(section.title)}</h3>
              <dl>
                {section.rows.map(([label, combo]) => (
                  <div className="shortcut-row" key={label}>
                    <dt>{t(label)}</dt>
                    <dd><Keys combo={combo} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="shortcuts-hint">{t('shortcuts.hint')}</p>
        <button className="about-close" onClick={onClose}>{t('about.close')}</button>
      </div>
    </div>
  )
}
