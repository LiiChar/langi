use std::path::{Path, PathBuf};

use crate::{
    application::books::ports::{book_parser::{BookParser, BookParserError}, book_scanner::{BookScanner, BookScannerError}}, domain::Book,
};

#[derive(Debug)]
pub struct ParseBooksResult {
    pub books: Vec<Book>,
    pub errors: Vec<ParseBookError>,
}

impl ParseBooksResult {
    pub fn is_success(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn has_books(&self) -> bool {
        !self.books.is_empty()
    }

    pub fn failed_count(&self) -> usize {
        self.errors.len()
    }

    pub fn parsed_count(&self) -> usize {
        self.books.len()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ParseBookError {
    #[error("failed to parse '{path}': {source}")]
    Parse {
        path: PathBuf,
        source: BookParserError,
    },

    #[error("failed to scan '{path}': {source}")]
    Scan {
        path: PathBuf,
        source: BookScannerError,
    },
}

pub struct ParseBookService<P, S> {
    parser: P,
    scanner: S,
}

impl<P, S> ParseBookService<P, S> {
    pub fn new(parser: P, scanner: S) -> Self {
        Self { parser, scanner }
    }
}

impl<P, S> ParseBookService<P, S>
where
    P: BookParser,
    S: BookScanner,
{
    pub fn parse_book(&self, path: impl AsRef<Path>) -> Result<Book, ParseBookError> {
        let path = path.as_ref();

        self.parser
            .parse(path)
            .map_err(|source| ParseBookError::Parse {
                path: path.to_path_buf(),
                source,
            })
    }

    pub fn parse_books(&self, path: impl AsRef<Path>) -> Result<ParseBooksResult, ParseBookError> {
        let root = path.as_ref();

        let paths = self
            .scanner
            .scan(root)
            .map_err(|source| ParseBookError::Scan {
                path: root.to_path_buf(),
                source,
            })?;

        let mut books = Vec::with_capacity(paths.len());
        let mut errors = Vec::new();

        for path in paths {
            match self.parser.parse(&path) {
                Ok(book) => books.push(book),

                Err(source) => {
                    errors.push(ParseBookError::Parse { path, source });
                }
            }
        }

        Ok(ParseBooksResult { books, errors })
    }
}
