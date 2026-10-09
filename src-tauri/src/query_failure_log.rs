use std::fs::{self, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const QUERY_FAILURE_LOG_FILE_NAME: &str = "query-failures.jsonl";

fn resolve_query_failure_log_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_log_dir()
        .map(|dir| dir.join(QUERY_FAILURE_LOG_FILE_NAME))
        .map_err(|error| error.to_string())
}

fn append_query_failure_log_line(
    log_path: &Path,
    payload: &serde_json::Value,
) -> Result<(), String> {
    if let Some(parent) = log_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|error| error.to_string())?;

    let mut writer = BufWriter::new(file);
    serde_json::to_writer(&mut writer, payload).map_err(|error| error.to_string())?;
    writer.write_all(b"\n").map_err(|error| error.to_string())?;
    writer.flush().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn append_query_failure_log(
    app: AppHandle,
    payload: serde_json::Value,
) -> Result<String, String> {
    let log_path = resolve_query_failure_log_path(&app)?;
    append_query_failure_log_line(&log_path, &payload)?;
    Ok(log_path.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_test_log_path(test_name: &str) -> PathBuf {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();

        std::env::temp_dir()
            .join(format!(
                "codict-query-failure-log-{test_name}-{unique_suffix}"
            ))
            .join(QUERY_FAILURE_LOG_FILE_NAME)
    }

    #[test]
    fn appends_json_lines_for_multiple_payloads() {
        let log_path = create_test_log_path("append");

        append_query_failure_log_line(
            &log_path,
            &json!({
                "query": {
                    "text": "available"
                },
                "error": {
                    "message": "timeout"
                }
            }),
        )
        .expect("first log append should succeed");
        append_query_failure_log_line(
            &log_path,
            &json!({
                "query": {
                    "text": "phenomenon"
                },
                "error": {
                    "status": 500
                }
            }),
        )
        .expect("second log append should succeed");

        let contents = fs::read_to_string(&log_path).expect("log file should be readable");
        let lines: Vec<&str> = contents.lines().collect();

        assert_eq!(lines.len(), 2);
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(lines[0])
                .expect("first line should be valid json")["query"]["text"],
            "available"
        );
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(lines[1])
                .expect("second line should be valid json")["error"]["status"],
            500
        );

        let _ = fs::remove_file(&log_path);
        if let Some(parent) = log_path.parent() {
            let _ = fs::remove_dir(parent);
        }
    }
}
