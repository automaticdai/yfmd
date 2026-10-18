use tauri::Emitter;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Entry {
    name: String,
    path: String,
    is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<Entry>>,
}

const SKIP_DIRS: &[&str] = &["node_modules", "target", "dist"];

/// One directory level. Children are loaded when the user expands a folder.
fn read_dir_one(dir: &std::path::Path) -> Vec<Entry> {
    let mut out = Vec::new();
    let Ok(entries) = std::fs::read_dir(dir) else {
        return out;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }
        let path = entry.path();
        let is_dir = path.is_dir();
        out.push(Entry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            children: None,
        });
    }
    out.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    out
}

#[tauri::command]
fn list_dir(app: tauri::AppHandle, path: String) -> Result<Vec<Entry>, String> {
    use tauri_plugin_fs::FsExt;
    let p = std::path::PathBuf::from(&path);
    if !app.fs_scope().is_allowed(&p) {
        return Err(format!("Path is not allowed: {path}"));
    }
    if !p.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }
    Ok(read_dir_one(&p))
}

/// Allow the opened file's directory (or an opened folder) on the fs and asset scopes.
#[tauri::command]
fn grant_access(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri::Manager;
    use tauri_plugin_fs::FsExt;
    let p = std::path::PathBuf::from(&path);
    let dir = if p.is_dir() {
        p.clone()
    } else {
        p.parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .map(|parent| parent.to_path_buf())
            .unwrap_or_else(|| p.clone())
    };
    app.fs_scope()
        .allow_directory(&dir, true)
        .map_err(|err| err.to_string())?;
    app.asset_protocol_scope()
        .allow_directory(&dir, true)
        .map_err(|err| err.to_string())?;
    if p.is_file() {
        let _ = app.fs_scope().allow_file(&p);
        let _ = app.asset_protocol_scope().allow_file(&p);
    }
    Ok(())
}

// File path the OS passed on launch (cold start via file association).
struct LaunchState(std::sync::Mutex<Option<String>>);

/// Returns (and clears) the file path the app was launched with, if any.
#[tauri::command]
fn get_launch_file(state: tauri::State<'_, LaunchState>) -> Option<String> {
    state.0.lock().ok().and_then(|mut g| g.take())
}

/// First non-flag argv entry (skips the program path and macOS-style `-…` flags).
fn first_file_arg(args: impl Iterator<Item = String>) -> Option<String> {
    args.skip(1).find(|a| !a.starts_with('-'))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Warm launch: forward the newly-opened file to the running window.
            if let Some(path) = first_file_arg(argv.into_iter()) {
                let _ = app.emit("open-file", path);
            }
        }))
        .manage(LaunchState(std::sync::Mutex::new(first_file_arg(std::env::args()))))
        .invoke_handler(tauri::generate_handler![list_dir, grant_access, get_launch_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
