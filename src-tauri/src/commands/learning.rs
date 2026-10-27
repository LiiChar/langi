use serde::Serialize;
use specta::Type;
use tauri::State;

use crate::{AppState, domain::learning::LearningActivity};


#[tauri::command]
#[specta::specta]
pub fn get_next_activity(state: State<'_, AppState>,) -> Result<LearningActivity, String> {
    let config = state.config.get();
    state.learning_engine.next_activity("0", &config.learning).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_book_exercise_events(state: State<'_, AppState>, book_id: String) -> Result<Vec<crate::domain::learning::LearningEvent>, String> {
    state.learning_engine.exercise_events_for_book("0", &book_id)
        .map_err(|error| error.to_string())
}

#[derive(Serialize, Type)]
pub struct LearningOverview {
    pub words: Vec<LearningWord>,
    pub skills: Vec<LearningSkill>,
    pub books: Vec<LearningBookProgress>,
}
#[derive(Serialize, Type)]
pub struct LearningWord {
    pub word_id: String,
    pub familiarity: f64,
    pub favorite: bool,
    pub state: String,
    pub exposure_count: u32,
    pub next_review_at: Option<f64>,
}
#[derive(Serialize, Type)]
pub struct LearningSkill { pub name: String, pub mastery: f64, pub confidence: f64, pub attempts: u32 }
#[derive(Serialize, Type)]
pub struct LearningBookProgress { pub book_id: String, pub chapters_started: u32, pub chapters_completed: u32, pub reading_seconds: u32, pub paragraphs_seen: u32 }
#[tauri::command]
#[specta::specta]
pub fn get_learning_overview(state: State<'_, AppState>) -> Result<LearningOverview, String> {
    let (words, skills, books) = state.learning_engine.overview("0").map_err(|e| e.to_string())?;
    Ok(LearningOverview {
        words: words.into_iter().map(|w| LearningWord { word_id: w.word_id, familiarity: w.familiarity, favorite: w.favorite, state: format!("{:?}", w.state), exposure_count: w.exposure_count.max(0) as u32, next_review_at: w.next_review_at.map(|d| d.timestamp_millis() as f64) }).collect(),
        skills: skills.into_iter().map(|s| LearningSkill { name: s.skill_id, mastery: s.mastery, confidence: s.confidence, attempts: s.attempts.max(0) as u32 }).collect(),
        books: books.into_iter().map(|b| LearningBookProgress { book_id: b.book_id, chapters_started: b.chapters_started.max(0) as u32, chapters_completed: b.chapters_completed.max(0) as u32, reading_seconds: b.reading_seconds.max(0) as u32, paragraphs_seen: b.paragraphs_seen.max(0) as u32 }).collect(),
    })
}

#[derive(Serialize, Type)]
pub struct ReadingPosition {
    pub chapter_id: String,
    pub element_id: String,
}

#[tauri::command]
#[specta::specta]
pub fn get_book_reading_position(state: State<'_, AppState>, book_id: String) -> Result<Option<ReadingPosition>, String> {
    state.learning_engine.reading_position("0", &book_id)
        .map(|position| position.map(|(chapter_id, element_id)| ReadingPosition { chapter_id, element_id }))
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_book_reading_position(state: State<'_, AppState>, book_id: String, chapter_id: String, element_id: String) -> Result<(), String> {
    state.learning_engine.save_reading_position("0", &book_id, &chapter_id, &element_id)
        .map_err(|error| error.to_string())
}
