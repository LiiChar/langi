use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TranslationMode {
    /// Cache -> local dictionary -> online provider.
    OnlineFirst,

    /// Cache -> online provider.
    OnlineOnly,

    /// Cache -> local dictionary.
    OfflineOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TranslationSource {
    Cache,
    LocalDictionary,
    Online,
}

#[derive(Debug, Clone)]
pub struct Translation {
    pub text: String,
    pub source: TranslationSource,
}

impl Translation {
    pub fn new(text: impl Into<String>, source: TranslationSource) -> Self {
        Self {
            text: text.into(),
            source,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TranslationRequest {
    pub text: String,
    pub source_language: String,
    pub target_language: String,
}

impl TranslationRequest {
    pub fn new(
        text: impl Into<String>,
        source_language: impl Into<String>,
        target_language: impl Into<String>,
    ) -> Self {
        Self {
            text: text.into(),
            source_language: normalize_language(&source_language.into()),
            target_language: normalize_language(&target_language.into()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct TranslationBatchRequest {
    pub texts: Vec<String>,
    pub source_language: String,
    pub target_language: String,
}

impl TranslationBatchRequest {
    pub fn new(
        texts: Vec<String>,
        source_language: impl Into<String>,
        target_language: impl Into<String>,
    ) -> Self {
        Self {
            texts,
            source_language: normalize_language(&source_language.into()),
            target_language: normalize_language(&target_language.into()),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TranslationError {
    #[error("translation input is empty")]
    EmptyInput,

    #[error("translation not found")]
    NotFound,

    #[error("unsupported language pair: {from} -> {to}")]
    UnsupportedLanguage {
        from: String,
        to: String,
    },

    #[error("network error: {0}")]
    Network(String),

    #[error("http error {status}: {message}")]
    Http {
        status: u16,
        message: String,
    },

    #[error("invalid provider response: {0}")]
    InvalidResponse(String),

    #[error("provider error: {0}")]
    Provider(String),

    #[error("batch size mismatch: expected {expected}, got {actual}")]
    BatchSizeMismatch {
        expected: usize,
        actual: usize,
    },
}

pub fn normalize_language(language: &str) -> String {
    match language.trim().to_ascii_lowercase().as_str() {
        "eng" | "en" => "en".into(),
        "rus" | "ru" => "ru".into(),
        "jpn" | "ja" => "ja".into(),
        "deu" | "de" => "de".into(),
        "fra" | "fr" => "fr".into(),
        "spa" | "es" => "es".into(),
        "ita" | "it" => "it".into(),
        "por" | "pt" => "pt".into(),
        "zho" | "zh" => "zh".into(),
        "kor" | "ko" => "ko".into(),
        other => other.to_owned(),
    }
}
