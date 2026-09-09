use std::{path::PathBuf, sync::Arc};

use application::books::parse::ParseBookService;
use infrastructure::{document_parser::DocumentBookParser, filesystem::FileSystemBookScanner};
use log::LevelFilter;
use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

use crate::{application::books::{BookServices, ImportBooksService}, infrastructure::{database::{repository::{book::{sqlite_book::SqliteBookRepository, sqlite_book_reading_progress::SqliteBookReadingProgressRepository}, learning::{sqlite_learning_event::SqliteLearningEventRepository, sqlite_user_level::SqliteUserLevelRepository, sqlite_user_skill::SqliteUserSkillRepository, sqlite_user_word::SqliteUserWordRepository}}, sqlite::{DatabaseError, SqliteDatabase}}, learning::engine::LearningEngine}};

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

pub struct AppState {
    pub book: BookServices,
    pub learning_engine: LearningEngine,
}

impl AppState {
    pub fn new(database_path: PathBuf) -> Self {
        let database =
            SqliteDatabase::open(
                database_path,
            ).unwrap();

        let book_repository = SqliteBookRepository::new(
            Arc::clone(
                &database.connection
            ),
        );

        let books =
            ImportBooksService::new(
                book_repository,
            );

        let learning_engine = LearningEngine::new(
            Arc::clone(
                &database.connection
            ),
        );

        Self {
            book: BookServices {
                import: books,
                parse: ParseBookService::new(DocumentBookParser::new(), FileSystemBookScanner),
            },
            learning_engine: learning_engine
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
            crate::commands::learning::get_next_activity,
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
