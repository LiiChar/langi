use std::sync::Arc;

use tauri::{AppHandle, State};
use tauri_specta::Event;

use crate::{
    AppState, domain::{
        Book, book::DownloadEvent,
    }, infrastructure::browser::{error::BookError, provider::{BookCapabilities, DownloadEventHandler}},
};

#[tauri::command]
#[specta::specta]
pub async fn get_books(
    state: State<'_, AppState>,
) -> Result<Vec<Book>, String> {
    state
        .book
        .import
        .get_books()
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_book(
    book_id: String,
    state: State<'_, AppState>,
) -> Result<Book, String> {
    state
        .book
        .import
        .get_book(&book_id)
        .map_err(|error| error.to_string())
}

// #[tauri::command]
// #[specta::specta]
// pub async fn search_book(
//     query: String,
//     state: State<'_, AppState>,
// ) -> Result<Vec<Book>, String> {
//     state
//         .book
//         .import
//         .search_books(&query)
//         .map_err(|error| error.to_string())
// }

#[tauri::command]
#[specta::specta]
pub fn get_browser_providers(
    state: State<'_, AppState>,
) -> Vec<String> {
    state.book.browser.get_providers()
}

#[tauri::command]
#[specta::specta]
pub async fn get_browser_book(
    provider: String,
    book_id: String,
    state: State<'_, AppState>,
) -> Result<Book, String> {
    state
        .book
        .browser
        .get_book(
            &provider,
            &book_id,
        )
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_browser_books(
    provider: String,
    state: State<'_, AppState>,
) -> Result<Vec<Book>, String> {
    state
        .book
        .browser
        .get_books_by_provider(&provider)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn search_browser_books(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<Book>, String> {
    state
        .book
        .browser
        .search_books(&query)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn search_browser_books_by_provider(
    provider: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<Book>, String> {
    state
        .book
        .browser
        .search_provider(
            &provider,
            &query,
        )
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn download_book(
    app: AppHandle,
    provider: String,
    book_id: String,
    format: String,
    state: State<'_, AppState>,
) -> Result<Book, String> {
    let on_event: DownloadEventHandler = {
        let app = app.clone();

        Arc::new(move |event: DownloadEvent| {
            if let Err(error) = event.emit(&app) {
                eprintln!("Failed to emit download event: {error}");
            }
        })
    };

    state
        .book
        .browser
        .download(&provider, &book_id, &format, on_event)
        .await
        .map_err(|error| error.to_string())
}


pub fn get_provider_capabilities(
    provider_id: &str,
    state: State<'_, AppState>,
) -> Result<BookCapabilities, BookError> {
    let provider = state
        .book
        .browser
        .get_provider(provider_id)
        .ok_or_else(|| {
            BookError::ProviderNotFound {
                provider: provider_id.to_string(),
            }
        })?;


    Ok(provider.capabilities())
}
