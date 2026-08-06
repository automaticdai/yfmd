# Settings, Typora-style Themes, Sidebar & Quit Fix — Design

**Goal:** Add a persisted Settings system with a modal dialog, four built-in
Typora-style themes behind a top-level Theme menu, sidebar off-by-default with a
toggle shortcut, editor layout controls (max text width, side margins, font size,
line height), autosave, and fix native Quit/window-close.

## Settings model (`src/app/settings.ts`, pure TS)

```ts
export type ThemeName = 'github' | 'night' | 'newsprint' | 'whitey'
export interface ThemeInfo { id: ThemeName; label: string; dark: boolean }
export const THEMES: ThemeInfo[]   // github/GitHub/false, night/Night/true,
                                   // newsprint/Newsprint/false, whitey/Whitey/false
export interface Settings {
  theme: ThemeName        // default 'github'
  maxWidth: number        // rem, clamp 40–80, default 46
  sideMargin: number      // rem, clamp 0–8, default 3
  fontSize: number        // px, clamp 12–24, default 16
  lineHeight: number      // clamp 1.2–2.2, default 1.7
  autosave: boolean       // default false
  sidebarTab: 'files' | 'outline'  // default 'files'
}
export const DEFAULT_SETTINGS: Settings
export function loadSettings(): Settings   // localStorage 'yfmd-settings';
  // merges partial/unknown data onto defaults, clamps numerics, validates enums;
  // migrates legacy 'yfmd-theme' (light→github, dark→night) when no settings stored
export function saveSettings(s: Settings): void
```

Unit tests cover defaults, round-trip, clamping, bad-data merge, legacy migration.

## Themes

- `src/styles/base.css` replaces `[data-theme='light'|'dark']` with four blocks
  `[data-theme='github'|'night'|'newsprint'|'whitey']` in the existing variable
  contract (`--bg --fg --fg-muted --accent --border --sidebar-bg --code-bg --error`)
  plus new `--editor-font` (Newsprint uses a serif stack; others keep sans).
  `:root` defaults equal GitHub. Palettes: GitHub ≈ current light; Night ≈ current
  dark; Newsprint = warm sepia paper (#f3f2ed bg, dark-brown fg, serif); Whitey =
  flat minimal white with near-black fg and gray accent.
- Menubar gains a top-level **Theme** menu with one item per theme
  (`data-action="theme:<id>"`); the active theme is marked with ✓. View → Toggle
  Theme is removed. `MenuBar` accepts `checkedActions?: Set<string>`.
- The mermaid `uiTheme` facet receives `'dark' | 'light'` from `THEMES[i].dark`.

## Layout via CSS variables

App root (documentElement) style gets `--editor-max-width` (rem),
`--editor-margin` (rem), `--editor-font-size` (px), `--editor-line-height` from
settings. `editor.css` consumes them with the old constants as fallbacks;
`setup.ts` `EditorView.theme` fontSize becomes `var(--editor-font-size, 16px)`.
Changes apply live without editor rebuild.

## Settings dialog (`src/app/SettingsDialog.tsx`)

`File → Settings…` (Ctrl+,) opens a modal (`.settings-dialog` on
`.modal-backdrop`): theme select, range sliders with value readouts for max
width / side margin / font size / line height, autosave checkbox, default-sidebar-
tab radio. Every change applies + persists immediately; × button and Esc close.
Controls carry `data-setting="<key>"` for e2e.

## Shell changes (App.tsx)

- Settings loaded once into state; an effect applies CSS vars + `data-theme` +
  mermaid facet + `rebuildWidgets`, and persists on every change.
- Sidebar starts hidden. **Ctrl+Shift+L** toggles it (View menu shows shortcut).
  `Sidebar` gets `defaultTab` prop used as initial tab (re-applied on remount —
  the sidebar unmounts when hidden).
- Autosave: when enabled, 2 s after the last edit, save silently — only if the
  document already has a path (untitled docs never trigger dialogs).
- Global shortcuts add Ctrl+, (settings) and Ctrl+Shift+L (sidebar).

## Quit fix (native)

Registering `onCloseRequested` in Tauri 2 shifts close responsibility to JS:
the wrapper calls `window.destroy()`, which requires the
`core:window:allow-destroy` permission — never granted, so X, the dirty-guard
paths, and File → Quit all silently fail. Add `core:window:allow-destroy` to
`src-tauri/capabilities/default.json`.

## Versioning / release

Bump version to 0.2.0 (package.json, tauri.conf.json, Cargo.toml). Push main,
tag `v0.2.0` → CI builds Windows installers → attach to a GitHub release.

## Testing

- Unit: settings module (above).
- E2E updates: sidebar-dependent tests open it first (Ctrl+Shift+L); theme test
  uses the Theme menu (`theme:night`) and checks persistence after reload.
- New E2E: sidebar hidden by default + shortcut toggles; Settings dialog changes
  `.cm-content` max-width live and persists after reload.

Out of scope: user-supplied CSS theme files, per-theme code-highlight palettes,
autosave for untitled documents.
