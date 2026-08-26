use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::State;

use crate::{
    domain::Book,
    AppState,
};

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct ParseBooksResponse {
    pub books: Vec<Book>,
    pub errors: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub fn command_parse_books(
    path: PathBuf,
    state: State<'_, AppState>,
) -> Result<ParseBooksResponse, String> {
    let result = state
        .book
        .parse
        .parse_books(&path)
        .map_err(|e| e.to_string())?;

    if !result.books.is_empty() {
        let save = state.book.import.import_books(result.books.clone().as_slice());
        log::info!("Saved books: {:?}", save);
    }

    Ok(ParseBooksResponse {
        books: result.books,
        errors: result
            .errors
            .into_iter()
            .map(|error| error.to_string())
            .collect(),
    })
}

#[tauri::command]
#[specta::specta]
pub fn command_parse_book(
    path: PathBuf,
    state: State<'_, AppState>,
) -> Result<Book, String> {
    let book = state
        .book
        .parse
        .parse_book(path)
        .map_err(|e| e.to_string())?;

    let save = state.book.import.import_book(book.clone());
    log::info!("Saved book: {:?}", save);

    Ok(book)
}
