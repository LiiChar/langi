use std::path::Path;

use crate::domain::Book;

#[derive(Debug, thiserror::Error)]
pub enum BookParserError {
    #[error("parser error: {0}")]
    Parser(String),
}

pub trait BookParser: Send + Sync {
    fn parse(&self, path: &Path) -> Result<Book, BookParserError>;
}
