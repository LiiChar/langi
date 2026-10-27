use std::{fs, path::Path, time::UNIX_EPOCH};

use document_parser::{ContentType, DocumentParser, ParseOptions};

use crate::{
    application::books::ports::book_parser::{BookParser, BookParserError}, domain::Book, infrastructure::document_parser::mapper::DocumentMapper,
};

pub struct DocumentBookParser {
    parser: DocumentParser,
}

impl Default for DocumentBookParser {
    fn default() -> Self {
        Self::new()
    }
}

impl DocumentBookParser {
    pub fn new() -> Self {
        let options = ParseOptions {
            content_type: ContentType::Html,
            image_load: document_parser::ImageLoadType::Base64,
            ..Default::default()
        };

        Self {
            parser: DocumentParser::new().with_options(options),
        }
    }
}

impl BookParser for DocumentBookParser {
    fn parse(&self, path: &Path) -> Result<Book, BookParserError> {
        let document = self
            .parser
            .parse(path)
            .map_err(|error| BookParserError::Parser(error.to_string()))?;

        let metadata =
            fs::metadata(path).map_err(|error| BookParserError::Parser(error.to_string()))?;

        let size = metadata.len() as i32;

        let last_modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs())
            .unwrap_or(0) as i32;

        let created_at = metadata
            .created()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs())
            .unwrap_or(0) as i32;

        Ok(DocumentMapper::to_book(
            document,
            path,
            size,
            last_modified,
            created_at,
        ))
    }
}
