use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use crate::application::books::ports::book_scanner::{BookScanner, BookScannerError};

pub struct FileSystemBookScanner;

impl BookScanner for FileSystemBookScanner {
    fn scan(&self, path: &Path) -> Result<Vec<PathBuf>, BookScannerError> {
        let extensions = [
            "txt", "epub", "fb2", "zip", "html", "htm", "md", "markdown", "docx", "pdf", "cbz",
            "mobi", "azw", "azw3", "rtf",
        ];

        let paths = WalkDir::new(path)
            .into_iter()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_file())
            .map(|entry| entry.into_path())
            .filter(|path| {
                path.extension()
                    .and_then(|extension| extension.to_str())
                    .map(|extension| {
                        extensions
                            .iter()
                            .any(|expected| expected.eq_ignore_ascii_case(extension))
                    })
                    .unwrap_or(false)
            })
            .collect();

        Ok(paths)
    }
}
