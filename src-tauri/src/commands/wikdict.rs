use std::path::PathBuf;

use specta::Type;
use tauri::{AppHandle, Manager, State};
use wikdict::{WikDictDownloader, ALL_DICTIONARIES, Language};

use crate::AppState;

#[derive(Debug, Clone, serde::Serialize, Type)]
pub struct WikDictPair {
    pub from: String,
    pub to: String,
    pub installed: bool,
}

pub(crate) fn dictionary_directory(app: &AppHandle, configured: Option<PathBuf>) -> Result<PathBuf, String> {
    let directory = match configured {
        Some(path) => path,
        None => app.path().app_data_dir().map_err(|error| error.to_string())?.join("wikdict"),
    };
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

#[tauri::command]
#[specta::specta]
pub fn get_wikdict_languages() -> Vec<String> {
    Language::ALL.iter().map(|language| language.code().to_string()).collect()
}

#[tauri::command]
#[specta::specta]
pub fn get_wikdict_dictionaries(app: AppHandle, state: State<'_, AppState>) -> Result<Vec<WikDictPair>, String> {
    let configured = state.config.get().translate.local_dictionary.dictionary_path;
    let directory = dictionary_directory(&app, configured)?;
    state.translator.set_local_dictionary_directory(directory.clone());
    Ok(ALL_DICTIONARIES.iter().filter_map(|dictionary| {
        let (from, to) = dictionary.languages();
        let path = directory.join(dictionary.file_name());
        path.exists().then(|| WikDictPair { from: from.code().into(), to: to.code().into(), installed: true })
    }).collect())
}

#[tauri::command]
#[specta::specta]
pub async fn download_wikdict_dictionary(app: AppHandle, state: State<'_, AppState>, from: String, to: String) -> Result<(), String> {
    let dictionary = ALL_DICTIONARIES.iter().copied().find(|dictionary| {
        let (source, target) = dictionary.languages();
        source.code() == from && target.code() == to
    }).ok_or_else(|| format!("Словарь {from} → {to} не поддерживается WikDict"))?;

    let configured = state.config.get().translate.local_dictionary.dictionary_path;
    let directory = dictionary_directory(&app, configured)?;
    state.translator.set_local_dictionary_directory(directory.clone());
    let destination = directory.join(dictionary.file_name());
    WikDictDownloader::new().map_err(|error| error.to_string())?
        .download(dictionary, destination).await.map_err(|error| error.to_string())?;
    Ok(())
}
