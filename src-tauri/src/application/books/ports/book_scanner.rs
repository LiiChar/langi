use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum BookScannerError {
    #[error("failed to scan filesystem: {0}")]
    Io(String),
}

pub trait BookScanner: Send + Sync {
    fn scan(&self, path: &Path) -> Result<Vec<PathBuf>, BookScannerError>;
}
