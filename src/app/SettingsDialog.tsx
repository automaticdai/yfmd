import { useEffect } from 'react'
import { BODY_FONTS, CODE_FONTS, type FontOption, fontStack } from './fonts'
import { LOCALES, t, type Locale } from './i18n'
import { SETTINGS_LIMITS, THEMES, type Settings } from './settings'

interface Props {
  settings: Settings
  onChange(next: Settings): void
  onClose(): void
}

function SliderRow({ label, setting, value, unit, min, max, step, onInput }: {
  label: string
  setting: string
  value: number
  unit: string
  min: number
  max: number
  step: number
  onInput(value: number): void
}) {
  return (
    <label className="settings-row">
      <span>{label}</span>
      <span className="settings-control">
        <input
          type="range"
          data-setting={setting}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onInput(Number(e.target.value))}
        />
        <span className="settings-value">{value}{unit}</span>
      </span>
    </label>
  )
}

/** Each option previews itself in its own stack. */
function FontRow({ label, setting, fonts, value, onPick }: {
  label: string
  setting: string
  fonts: FontOption[]
  value: string
  onPick(id: string): void
}) {
  return (
    <label className="settings-row">
      <span>{label}</span>
      <select data-setting={setting} value={value} onChange={e => onPick(e.target.value)}>
        {fonts.map(f => (
          <option key={f.id} value={f.id} style={{ fontFamily: fontStack(f.id, fonts) ?? undefined }}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function SettingsDialog({ settings, onChange, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })
  const L = SETTINGS_LIMITS

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="settings-dialog">
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <label className="settings-row">
          <span>{t('settings.theme')}</span>
          <select
            data-setting="theme"
            value={settings.theme}
            onChange={e => set('theme', e.target.value as Settings['theme'])}
          >
            {THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label className="settings-row">
          <span>{t('settings.language')}</span>
          <select
            data-setting="language"
            value={settings.language}
            onChange={e => set('language', e.target.value as Locale)}
          >
            {LOCALES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
        <FontRow label={t('settings.editorFont')} setting="bodyFont" fonts={BODY_FONTS}
          value={settings.bodyFont} onPick={id => set('bodyFont', id)} />
        <FontRow label={t('settings.codeFont')} setting="codeFont" fonts={CODE_FONTS}
          value={settings.codeFont} onPick={id => set('codeFont', id)} />
        <SliderRow label={t('settings.maxWidth')} setting="maxWidth" value={settings.maxWidth} unit="rem"
          min={L.maxWidth.min} max={L.maxWidth.max} step={L.maxWidth.step}
          onInput={v => set('maxWidth', v)} />
        <SliderRow label={t('settings.sideMargin')} setting="sideMargin" value={settings.sideMargin} unit="rem"
          min={L.sideMargin.min} max={L.sideMargin.max} step={L.sideMargin.step}
          onInput={v => set('sideMargin', v)} />
        <SliderRow label={t('settings.fontSize')} setting="fontSize" value={settings.fontSize} unit="px"
          min={L.fontSize.min} max={L.fontSize.max} step={L.fontSize.step}
          onInput={v => set('fontSize', v)} />
        <SliderRow label={t('settings.lineHeight')} setting="lineHeight" value={settings.lineHeight} unit=""
          min={L.lineHeight.min} max={L.lineHeight.max} step={L.lineHeight.step}
          onInput={v => set('lineHeight', v)} />
        <label className="settings-row">
          <span>{t('settings.autosave')}</span>
          <input
            type="checkbox"
            data-setting="autosave"
            checked={settings.autosave}
            onChange={e => set('autosave', e.target.checked)}
          />
        </label>
        <div className="settings-row">
          <span>{t('settings.sidebarOpensOn')}</span>
          <span className="settings-control">
            {(['files', 'outline'] as const).map(tab => (
              <label key={tab} className="settings-radio">
                <input
                  type="radio"
                  name="sidebar-tab"
                  data-setting={`sidebarTab-${tab}`}
                  checked={settings.sidebarTab === tab}
                  onChange={() => set('sidebarTab', tab)}
                />
                {tab === 'files' ? t('sidebar.files') : t('sidebar.outline')}
              </label>
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}
