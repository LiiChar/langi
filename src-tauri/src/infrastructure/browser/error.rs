
#[derive(Debug, thiserror::Error)]
pub enum BookError {
    #[error("Failed to parse book")]
    ParseError,

    #[error("Not found")]
    NotFound,

    #[error("unsupported book type: {0}")]
    UnsupportedLanguage(String),

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

    #[error("provider not found: {provider}")]
    ProviderNotFound {
        provider: String,
    },

    #[error(
        "operation `{operation}` is not supported by provider `{provider}`"
    )]
    UnsupportedOperation {
        provider: String,
        operation: String,
    },

    #[error("request failed: {0}")]
    Request(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
