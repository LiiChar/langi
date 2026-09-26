use tauri::State;

use crate::{AppState, domain::config::{Config, DownloadConfig, GeneralConfig, LearningConfig, ReaderConfig, TranslateConfig}};

#[tauri::command]
#[specta::specta]
pub fn get_config(
    state: State<'_, AppState>,
) -> Result<Config, String> {
    Ok(state.config.get())
}

#[tauri::command]
#[specta::specta]
pub fn update_config(
    config: Config,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_general_config(
    config: GeneralConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update_general(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_download_config(
    config: DownloadConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update_download(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_translate_config(
    config: TranslateConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update_translate(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_reader_config(
    config: ReaderConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update_reader(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn update_learning_config(
    config: LearningConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.config.update_learning(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn reset_config(
    state: State<'_, AppState>,
) -> Result<Config, String> {
    state.config.reset().map_err(|e| e.to_string());

    Ok(state.config.get())
}

#[tauri::command]
#[specta::specta]
pub fn reload_config(
    state: State<'_, AppState>,
) -> Result<Config, String> {
    state.config.reload().map_err(|e| e.to_string());

    Ok(state.config.get())
}

#[tauri::command]
#[specta::specta]
pub fn get_config_path(
    state: State<'_, AppState>,
) -> String {
    state.config.path().to_string_lossy().into_owned()
}
