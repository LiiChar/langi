use std::path::PathBuf;

use tauri::State;

use crate::{AppState, domain::Book};

#[tauri::command]
#[specta::specta]
pub fn get_books(state: State<'_, AppState>) -> Result<Vec<Book>, String> {
    state.book.import.get_books().map_err(|e| e.to_string())
}


#[tauri::command]
#[specta::specta]
pub fn get_book(book_id: String, state: State<'_, AppState>) -> Result<Book, String> {
    state.book.import.get_book(&book_id).map_err(|e| e.to_string())
}
