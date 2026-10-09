use tauri::{
    menu::{MenuBuilder, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle,
};

const REOPEN_ID: &str = "reopen-main-window";
const EXIT_ID: &str = "exit-app";

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let reopen = MenuItem::with_id(app, REOPEN_ID, "打开 Lexora", true, None::<&str>)?;
    let exit = MenuItem::with_id(app, EXIT_ID, "退出", true, None::<&str>)?;
    let menu = MenuBuilder::new(app).item(&reopen).item(&exit).build()?;

    let mut builder = TrayIconBuilder::with_id("codict-tray")
        .menu(&menu)
        .tooltip("Lexora")
        .show_menu_on_left_click(true)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| match event.id().as_ref() {
            REOPEN_ID => {
                let _ = crate::window_policy::show_main_window(app.clone());
            }
            EXIT_ID => {
                let _ = crate::window_policy::exit_app(app.clone());
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}
