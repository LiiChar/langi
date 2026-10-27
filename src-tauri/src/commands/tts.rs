use tauri::State;
use crate::AppState;

#[tauri::command]
#[specta::specta]
pub async fn speak_text(state: State<'_, AppState>, text: String) -> Result<(), String> {
    state.tts.as_ref().ok_or_else(|| "Piper TTS не удалось запустить: проверьте аудиоустройство и модели".to_string())?.speak(text).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn stop_speech(state: State<'_, AppState>) { if let Some(tts) = &state.tts { tts.stop(); } }

#[tauri::command]
#[specta::specta]
pub fn pause_speech(state: State<'_, AppState>) { if let Some(tts) = &state.tts { tts.pause(); } }

#[tauri::command]
#[specta::specta]
pub fn resume_speech(state: State<'_, AppState>) { if let Some(tts) = &state.tts { tts.resume(); } }

#[tauri::command]
#[specta::specta]
pub fn is_speech_playing(state: State<'_, AppState>) -> bool {
    state.tts.as_ref().is_some_and(|tts| tts.is_playing())
}

#[tauri::command]
#[specta::specta]
pub fn get_tts_voices(state: State<'_, AppState>) -> Result<Vec<crate::domain::tts::TTSVoice>, String> {
    state.tts.as_ref().ok_or_else(|| "Piper TTS не удалось запустить".to_string())?.voices().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn prepare_speech_for_language(state: State<'_, AppState>, language: String) -> Result<(), String> {
    state.tts.as_ref().ok_or_else(|| "Piper TTS не удалось запустить".to_string())?
        .prepare_language(&language).map_err(|error| error.to_string())
}
