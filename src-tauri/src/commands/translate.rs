use tauri::{AppHandle, State};

use crate::AppState;


#[tauri::command]
#[specta::specta]
pub async fn translate(app: AppHandle, state: State<'_, AppState>, from: String, to: String, text: String) -> Result<String, String> {
    let configured = state.config.get().translate.local_dictionary.dictionary_path;
    let dictionary_directory = crate::commands::wikdict::dictionary_directory(&app, configured)?;
    state.translator.set_local_dictionary_directory(dictionary_directory.clone());
    let config = state.config.get();
    let from = if from.trim().is_empty() { config.translate.source_language } else { from };
    let to = if to.trim().is_empty() { config.translate.target_language } else { to };
    let mode = match config.translate.mode {
        crate::domain::config::TranslationMode::OnlineFirst => crate::infrastructure::translate::TranslationMode::OnlineFirst,
        crate::domain::config::TranslationMode::OfflineFirst => crate::infrastructure::translate::TranslationMode::OfflineFirst,
        crate::domain::config::TranslationMode::OnlineOnly => crate::infrastructure::translate::TranslationMode::OnlineOnly,
        crate::domain::config::TranslationMode::OfflineOnly => crate::infrastructure::translate::TranslationMode::OfflineOnly,
    };
    state.translator.set_mode(mode).await;
    let value = state.translator.translate(&text, &from, &to).await.map_err(|err| {
        if matches!(err, crate::infrastructure::translate::TranslationError::NotFound | crate::infrastructure::translate::TranslationError::UnsupportedLanguage { .. }) {
            let dictionary_path = dictionary_directory.join(format!("{from}-{to}.sqlite3"));
            if !dictionary_path.exists() {
                format!("Словарь {from} → {to} не установлен. Откройте страницу «Словари» и скачайте эту языковую пару.")
            } else {
                format!("В офлайн-словаре {from} → {to} нет перевода для «{text}».")
            }
        } else {
            err.to_string()
        }
    });

    match value {
        Ok(v) => Ok(v.text),
        Err(err) => Err(err)
    }
}
