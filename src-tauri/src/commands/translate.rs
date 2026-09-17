use tauri::State;

use crate::AppState;


#[tauri::command]
#[specta::specta]
pub async fn translate(state: State<'_, AppState>, from: String, to: String, text: String) -> Result<String, String> {
    let value = state.translator.translate(text, from, to).await.map_err(|err| {
        err.to_string()
    });

    match value {
        Ok(v) => Ok(v.text),
        Err(err) => Err(err)
    }
}
