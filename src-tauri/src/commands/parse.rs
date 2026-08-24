use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_specta::{collect_commands, Builder};
use specta::Type;

use crate::{
    application::books::parse::{ParseBookError, ParseBookService, ParseBooksResult},
    domain::Book,
    infrastructure::{document_parser::DocumentBookParser, filesystem::FileSystemBookScanner},
};

type AppParseService = ParseBookService<DocumentBookParser, FileSystemBookScanner>;

#[derive(Type, Debug, Clone, Serialize, Deserialize)]
pub struct ParseBooksResponse {
    pub books: Vec<Book>,
    pub errors: Vec<String>,
}

#[tauri::command]
#[specta::specta]
pub fn command_parse_books(
    path: PathBuf,
    service: State<'_, AppParseService>,
) -> Result<ParseBooksResponse, String> {
    let result = service.parse_books(&path).map_err(|e| e.to_string())?;

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
    service: State<'_, AppParseService>,
) -> Result<Book, String> {
    service.parse_book(path).map_err(|e| e.to_string())
}
