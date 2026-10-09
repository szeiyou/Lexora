use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, PhysicalSize, Size, WebviewWindow, WindowEvent};

const WINDOW_SIZE_FILE_NAME: &str = "codict.window-size.json";
const MIN_WINDOW_WIDTH: u32 = 320;
const MIN_WINDOW_HEIGHT: u32 = 240;
const MAX_WINDOW_WIDTH: u32 = 10_000;
const MAX_WINDOW_HEIGHT: u32 = 10_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WindowSize {
    width: u32,
    height: u32,
}

pub fn install_main_window_size_persistence(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    match resolve_window_size_path(app) {
        Ok(state_path) => {
            restore_window_size(&window, &state_path);
            watch_window_size(window.clone(), state_path);
        }
        Err(error) => {
            eprintln!("window size persistence disabled: {error}");
        }
    }

    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn resolve_window_size_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(WINDOW_SIZE_FILE_NAME))
        .map_err(|error| error.to_string())
}

fn restore_window_size(window: &WebviewWindow, state_path: &Path) {
    let Some(size) = read_window_size(state_path) else {
        return;
    };

    let restore_result =
        window.set_size(Size::Physical(PhysicalSize::new(size.width, size.height)));
    if let Err(error) = restore_result {
        eprintln!("failed to restore persisted window size: {error}");
    }
}

fn watch_window_size(window: WebviewWindow, state_path: PathBuf) {
    let observed_window = window.clone();

    window.on_window_event(move |event| match event {
        WindowEvent::Resized(size)
        | WindowEvent::ScaleFactorChanged {
            new_inner_size: size,
            ..
        } => {
            if should_skip_window_size_save(&observed_window) {
                return;
            }

            let size = WindowSize {
                width: size.width,
                height: size.height,
            };
            if let Err(error) = write_window_size(&state_path, size) {
                eprintln!("failed to persist window size: {error}");
            }
        }
        WindowEvent::CloseRequested { .. } => {
            if let Err(error) = save_current_window_size(&observed_window, &state_path) {
                eprintln!("failed to persist window size before close: {error}");
            }
        }
        _ => {}
    });
}

fn should_skip_window_size_save(window: &WebviewWindow) -> bool {
    window.is_minimized().unwrap_or(false) || window.is_maximized().unwrap_or(false)
}

fn save_current_window_size(window: &WebviewWindow, state_path: &Path) -> Result<(), String> {
    if should_skip_window_size_save(window) {
        return Ok(());
    }

    let size = window.inner_size().map_err(|error| error.to_string())?;
    write_window_size(
        state_path,
        WindowSize {
            width: size.width,
            height: size.height,
        },
    )
}

fn read_window_size(state_path: &Path) -> Option<WindowSize> {
    let contents = fs::read_to_string(state_path).ok()?;
    let value = serde_json::from_str::<serde_json::Value>(&contents).ok()?;
    parse_window_size(&value)
}

fn parse_window_size(value: &serde_json::Value) -> Option<WindowSize> {
    let width = value.get("width")?.as_u64()?.try_into().ok()?;
    let height = value.get("height")?.as_u64()?.try_into().ok()?;

    if !is_reasonable_window_size(width, height) {
        return None;
    }

    Some(WindowSize { width, height })
}

fn is_reasonable_window_size(width: u32, height: u32) -> bool {
    (MIN_WINDOW_WIDTH..=MAX_WINDOW_WIDTH).contains(&width)
        && (MIN_WINDOW_HEIGHT..=MAX_WINDOW_HEIGHT).contains(&height)
}

fn write_window_size(state_path: &Path, size: WindowSize) -> Result<(), String> {
    if !is_reasonable_window_size(size.width, size.height) {
        return Ok(());
    }

    if let Some(parent) = state_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = serde_json::json!({
        "width": size.width,
        "height": size.height
    });
    fs::write(state_path, payload.to_string()).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_test_window_size_path(test_name: &str) -> PathBuf {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();

        std::env::temp_dir()
            .join(format!("codict-window-size-{test_name}-{unique_suffix}"))
            .join(WINDOW_SIZE_FILE_NAME)
    }

    #[test]
    fn reads_valid_persisted_window_size() {
        let state_path = create_test_window_size_path("read-valid");
        fs::create_dir_all(state_path.parent().expect("test path should have parent"))
            .expect("test state dir should be created");
        fs::write(
            &state_path,
            json!({
                "width": 1380,
                "height": 860
            })
            .to_string(),
        )
        .expect("test state file should be written");

        let size = read_window_size(&state_path).expect("persisted window size should be read");

        assert_eq!(
            size,
            WindowSize {
                width: 1380,
                height: 860
            }
        );

        let _ = fs::remove_file(&state_path);
        if let Some(parent) = state_path.parent() {
            let _ = fs::remove_dir(parent);
        }
    }

    #[test]
    fn ignores_corrupt_or_out_of_range_window_size() {
        let corrupt_path = create_test_window_size_path("corrupt");
        fs::create_dir_all(corrupt_path.parent().expect("test path should have parent"))
            .expect("test state dir should be created");
        fs::write(&corrupt_path, "{").expect("corrupt test state should be written");

        assert_eq!(read_window_size(&corrupt_path), None);

        let tiny = json!({ "width": 120, "height": 80 });
        assert_eq!(parse_window_size(&tiny), None);

        let huge = json!({ "width": 12000, "height": 900 });
        assert_eq!(parse_window_size(&huge), None);

        let _ = fs::remove_file(&corrupt_path);
        if let Some(parent) = corrupt_path.parent() {
            let _ = fs::remove_dir(parent);
        }
    }

    #[test]
    fn writes_window_size_creating_parent_directory() {
        let state_path = create_test_window_size_path("write");

        write_window_size(
            &state_path,
            WindowSize {
                width: 1440,
                height: 900,
            },
        )
        .expect("window size should be written");

        let persisted = fs::read_to_string(&state_path).expect("state file should be readable");
        let parsed: serde_json::Value =
            serde_json::from_str(&persisted).expect("state file should be json");

        assert_eq!(parsed["width"], 1440);
        assert_eq!(parsed["height"], 900);

        let _ = fs::remove_file(&state_path);
        if let Some(parent) = state_path.parent() {
            let _ = fs::remove_dir(parent);
        }
    }
}
