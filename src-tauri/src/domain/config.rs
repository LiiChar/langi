use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Config {
    pub general: GeneralConfig,
    pub download: DownloadConfig,
    pub translate: TranslateConfig,
    pub reader: ReaderConfig,
    pub learning: LearningConfig,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            download: DownloadConfig::default(),
            translate: TranslateConfig::default(),
            reader: ReaderConfig::default(),
            learning: LearningConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DownloadConfig {
    /// Максимальное количество одновременных загрузок
    pub max_concurrent_downloads: i32,

    /// Таймаут HTTP-запроса в секундах
    pub request_timeout_secs: i32,

    /// Количество повторных попыток
    pub max_retries: i32,

    /// Размер буфера загрузки
    pub buffer_size: i32,

    /// Автоматически продолжать прерванную загрузку
    pub resume_downloads: bool,

    /// Папка для загруженных книг
    pub books_dir: PathBuf,

    /// Папка для временных файлов
    pub temp_dir: PathBuf,

    /// Сохранять обложки книг
    pub download_covers: bool,

    /// Максимальный размер книги в MB
    pub max_book_size_mb: i32,

    /// Включённые источники книг
    pub enabled_sources: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TranslateConfig {
    pub mode: TranslationMode,

    pub source_language: String,
    pub target_language: String,

    pub local_dictionary: LocalDictionaryConfig,
    pub online: OnlineTranslateConfig,
    pub cache: TranslationCacheConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LocalDictionaryConfig {
    pub enabled: bool,
    pub dictionary_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct OnlineTranslateConfig {
    pub enabled: bool,
    pub timeout_secs: i32,
    pub batch_size: i32,
    pub max_retries: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TranslationCacheConfig {
    pub enabled: bool,
    pub ttl_secs: i32,
    pub max_entries: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum TranslationMode {
    OnlineFirst,
    OnlineOnly,
    OfflineOnly,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReaderConfig {
    pub font_family: String,
    pub font_size: i32,
    pub line_height: f32,
    pub content_width: i32,

    pub theme: ReaderTheme,

    pub show_word_translation: bool,
    pub show_sentence_translation: bool,

    pub remember_position: bool,
    pub restore_last_book: bool,

    pub show_page_numbers: bool,
    pub show_progress: bool,
    pub show_chapter_progress: bool,

    pub allow_text_selection: bool,

    pub auto_complete_elements: bool,
    pub mark_chapter_completed: bool,

    pub progress_save_interval_secs: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum ReaderTheme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LearningConfig {
    pub enabled: bool,

    pub auto_add_words: bool,
    pub auto_mark_known_words: bool,

    pub adaptive_learning: bool,

    pub exercises: ExercisesConfig,
    pub review: ReviewConfig,

    pub show_hints: bool,
    pub show_statistics: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ExercisesConfig {
    pub enabled: bool,

    pub translation: bool,
    pub comprehension: bool,

    pub words_per_exercise: i32,
    pub max_per_session: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReviewConfig {
    pub enabled: bool,

    pub initial_interval_days: i32,
    pub max_interval_days: i32,

    pub known_word_threshold: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GeneralConfig {
    pub language: String,

    pub auto_update: bool,

    pub telemetry_enabled: bool,

    pub data_dir: PathBuf,

    pub cache_dir: PathBuf,

    pub log_level: LogLevel,
}
