use std::{path::PathBuf, sync::Arc};

use application::books::parse::ParseBookService;
use infrastructure::{document_parser::DocumentBookParser, filesystem::FileSystemBookScanner};
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{Builder, Event, collect_commands, collect_events};

use crate::{application::books::{BookServices, ImportBooksService}, domain::{book::DownloadEvent, learning::LearningEvent}, infrastructure::{browser::create_browser_service, config::ConfigService, database::{repository::book::sqlite_book::SqliteBookRepository, sqlite::SqliteDatabase}, learning::engine::LearningEngine, translate::{TranslationService, create_translation_service}}};

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

pub struct AppState {
    pub book: BookServices,
    pub learning_engine: LearningEngine,
    pub translator: TranslationService,
    pub config: ConfigService,
    pub tts: Option<infrastructure::tts::service::TtsService>,
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

        let translator = create_translation_service().unwrap();

        let browser = create_browser_service().unwrap();

        let config = ConfigService::new("../../config.toml").unwrap();
        let tts = infrastructure::tts::create_tts_service().ok();

        Self {
            book: BookServices {
                import: books,
                parse: ParseBookService::new(DocumentBookParser::new(), FileSystemBookScanner),
                browser,
            },
            learning_engine: learning_engine,
            translator,
            config,
            tts
        }
    }
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database_path = PathBuf::from("../db.sqlite");

    let state = AppState::new(database_path);

    let spectra_builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            crate::commands::parse::command_parse_book,
            crate::commands::parse::command_parse_books,
            crate::commands::books::get_books,
            crate::commands::books::get_book,
            crate::commands::books::get_browser_books,
            crate::commands::books::get_browser_book,
            crate::commands::books::get_browser_providers,
            crate::commands::books::download_book,
            crate::commands::learning::get_next_activity,
            crate::commands::learning::get_book_exercise_events,
              crate::commands::learning::get_learning_overview,
            crate::commands::learning::get_book_reading_position,
            crate::commands::learning::save_book_reading_position,
            crate::commands::translate::translate,
            crate::commands::config::get_config,
            crate::commands::config::update_config,
            crate::commands::config::update_general_config,
            crate::commands::config::update_download_config,
            crate::commands::config::update_translate_config,
            crate::commands::config::update_reader_config,
            crate::commands::config::update_learning_config,
            crate::commands::config::reset_config,
            crate::commands::config::reload_config,
            crate::commands::config::get_config_path,
            crate::commands::tts::speak_text,
            crate::commands::tts::stop_speech,
            crate::commands::tts::pause_speech,
            crate::commands::tts::resume_speech,
            crate::commands::tts::is_speech_playing,
            crate::commands::tts::get_tts_voices,
            crate::commands::tts::prepare_speech_for_language,
            crate::commands::wikdict::get_wikdict_languages,
            crate::commands::wikdict::get_wikdict_dictionaries,
            crate::commands::wikdict::download_wikdict_dictionary,
        ])
        .events(collect_events![LearningEvent, DownloadEvent]);

    #[cfg(debug_assertions)]
    spectra_builder
        .export(
            Typescript::default(),
            "../src/shared/commands/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    // #[cfg(debug_assertions)]
    // let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default();

    #[cfg(debug_assertions)]
    {
        // builder = builder.plugin(devtools);
    }

    // #[cfg(not(debug_assertions))]
    // {
    builder = builder.plugin(
        tauri_plugin_log::Builder::new()
            .level(tauri_plugin_log::log::LevelFilter::Info)
            .level_for("tauri", tauri_plugin_log::log::LevelFilter::Warn)
            .level_for("wry", tauri_plugin_log::log::LevelFilter::Warn)
            .level_for("tracing::span", tauri_plugin_log::log::LevelFilter::Off)
            .build(),
    );
    // }

    builder.manage(state)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(spectra_builder.invoke_handler())
        .setup(move |app| {
            spectra_builder.mount_events(app);

            let state = app.state::<AppState>();
            let learning_engine = state.learning_engine.clone();

            LearningEvent::listen(app, move |event| {
                learning_engine.process_event(&event.payload).map_err(|err| {
                    log::warn!("Failed proccess event by {}", err.to_string())
                });
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
