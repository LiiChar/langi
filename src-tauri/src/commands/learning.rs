use tauri::State;

use crate::{AppState, domain::learning::LearningActivity};


#[tauri::command]
#[specta::specta]
pub fn get_next_activity(state: State<'_, AppState>,) -> Result<LearningActivity, String> {
    state.learning_engine.next_activity("0").map_err(|e| e.to_string())
}
