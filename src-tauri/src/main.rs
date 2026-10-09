#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod query_failure_log;
mod tray;
mod window_policy;
mod window_size;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            query_failure_log::append_query_failure_log,
            window_policy::hide_to_tray,
            window_policy::show_main_window,
            window_policy::exit_app
        ])
        .setup(|app| {
            window_size::install_main_window_size_persistence(&app.handle())?;
            tray::create_tray(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run CoDict");
}
