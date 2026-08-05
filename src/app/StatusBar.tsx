interface Props { path: string | null; dirty: boolean; sourceMode: boolean }

export function StatusBar({ path, dirty, sourceMode }: Props) {
  const name = path ? path.slice(path.lastIndexOf('/') + 1) : 'untitled'
  return (
    <div className="statusbar">
      <span className="file-name">
        {name}
        {dirty && <span className="dirty-dot" title="unsaved changes"> ●</span>}
      </span>
      {sourceMode && <span className="source-badge">SOURCE</span>}
    </div>
  )
}
