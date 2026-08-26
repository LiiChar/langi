use std::path::PathBuf;

use application::books::parse::ParseBookService;
use infrastructure::{document_parser::DocumentBookParser, filesystem::FileSystemBookScanner};
use log::LevelFilter;
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

use crate::{application::books::{BookServices, ImportBooksService}, infrastructure::database::{repository::book::sqlite_book::SqliteBookRepository, sqlite::{DatabaseError, SqliteDatabase}}};

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

pub struct AppState {
    pub book: BookServices,
}

impl AppState {
    pub fn new(database_path: PathBuf) -> Self {
        let database =
            SqliteDatabase::open(
                database_path,
            ).unwrap();

        let repository =
            database.book_repository();

        let books =
            ImportBooksService::new(
                repository,
            );

        Self {
            book: BookServices {
                import: books,
                parse: ParseBookService::new(DocumentBookParser::new(), FileSystemBookScanner),
            },
        }
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_path = PathBuf::from("../db.sqlite");

    let state = AppState::new(database_path);

    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            crate::commands::parse::command_parse_book,
            crate::commands::parse::command_parse_books,
            crate::commands::books::get_books,
            crate::commands::books::get_book,
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            Typescript::default(),
            "../src/shared/commands/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .manage(state) // ✅ This is correct - you're managing the state
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler()) // ✅ This should include the builder's invoke handler
        .setup(move |app| {
            builder.mount_events(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
