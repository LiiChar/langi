use std::path::PathBuf;

use crate::domain::config::{DownloadConfig, ExercisesConfig, GeneralConfig, LearningConfig, LocalDictionaryConfig, LogLevel, OnlineTranslateConfig, ReaderConfig, ReaderTheme, ReviewConfig, TranslateConfig, TranslationCacheConfig, TranslationMode};

impl Default for DownloadConfig {
    fn default() -> Self {
        Self {
            max_concurrent_downloads: 3,
            request_timeout_secs: 30,
            max_retries: 3,
            buffer_size: 64 * 1024,
            resume_downloads: true,
            books_dir: PathBuf::from("books"),
            temp_dir: PathBuf::from("tmp"),
            download_covers: true,
            max_book_size_mb: 500,
            enabled_sources: vec![
                "gutenberg".to_string(),
                "standard_ebooks".to_string(),
            ],
        }
    }
}

impl Default for TranslateConfig {
    fn default() -> Self {
        Self {
            mode: TranslationMode::OnlineFirst,
            source_language: "en".to_string(),
            target_language: "ru".to_string(),
            local_dictionary: LocalDictionaryConfig::default(),
            online: OnlineTranslateConfig::default(),
            cache: TranslationCacheConfig::default(),
        }
    }
}

impl Default for LocalDictionaryConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            dictionary_path: None,
        }
    }
}

impl Default for OnlineTranslateConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            timeout_secs: 10,
            batch_size: 10,
            max_retries: 1,
        }
    }
}

impl Default for TranslationCacheConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            ttl_secs: 24 * 60 * 60,
            max_entries: 10_000,
        }
    }
}

impl Default for TranslationMode {
    fn default() -> Self {
        Self::OnlineFirst
    }
}

impl Default for ReaderConfig {
    fn default() -> Self {
        Self {
            font_family: "Literata".to_string(),
            font_size: 18,
            line_height: 1.6,
            content_width: 760,

            theme: ReaderTheme::System,

            show_word_translation: true,
            show_sentence_translation: true,

            remember_position: true,
            restore_last_book: true,

            show_page_numbers: true,
            show_progress: true,
            show_chapter_progress: true,

            allow_text_selection: true,

            auto_complete_elements: true,
            mark_chapter_completed: true,

            progress_save_interval_secs: 5,
        }
    }
}

impl Default for ReaderTheme {
    fn default() -> Self {
        Self::System
    }
}

impl Default for LearningConfig {
    fn default() -> Self {
        Self {
            enabled: true,

            auto_add_words: true,
            auto_mark_known_words: false,

            adaptive_learning: true,

            exercises: ExercisesConfig::default(),
            review: ReviewConfig::default(),

            show_hints: true,
            show_statistics: true,
        }
    }
}

impl Default for ExercisesConfig {
    fn default() -> Self {
        Self {
            enabled: true,

            translation: true,
            comprehension: true,

            words_per_exercise: 10,
            max_per_session: 20,
        }
    }
}

impl Default for ReviewConfig {
    fn default() -> Self {
        Self {
            enabled: true,

            initial_interval_days: 1,
            max_interval_days: 90,

            known_word_threshold: 0.9,
        }
    }
}

impl Default for LogLevel {
    fn default() -> Self {
        Self::Info
    }
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            language: "ru".to_string(),

            auto_update: true,

            telemetry_enabled: false,

            data_dir: PathBuf::from("data"),
            cache_dir: PathBuf::from("cache"),

            log_level: LogLevel::Info,
        }
    }
}
