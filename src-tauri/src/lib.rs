use application::books::parse::ParseBookService;
use infrastructure::{document_parser::DocumentBookParser, filesystem::FileSystemBookScanner};
use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

pub struct AppState {
    pub parse_books: ParseBookService<DocumentBookParser, FileSystemBookScanner>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            parse_books: ParseBookService::new(DocumentBookParser::new(), FileSystemBookScanner),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::new();

    let builder = Builder::<tauri::Wry>::new()
            // Then register them (separated by a comma)
            .commands(collect_commands![
                crate::commands::parse::command_parse_book,
                crate::commands::parse::command_parse_books,
            ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
        builder
            .export(Typescript::default(), "../src/shared/bindings.ts")
            .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_opener::init()
        )
        .manage(state)
        .setup(move |app| {
            builder.mount_events(app);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
