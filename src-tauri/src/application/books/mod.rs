pub mod parse;
pub mod import;
pub mod ports;

pub use import::{
    ImportBooksError,
    ImportBooksService,
};

use crate::{application::books::parse::ParseBookService, infrastructure::{database::repository::book::sqlite_book::SqliteBookRepository, document_parser::DocumentBookParser, filesystem::FileSystemBookScanner}};

pub struct BookServices {
    pub parse: ParseBookService<DocumentBookParser, FileSystemBookScanner>,
    pub import: ImportBooksService<
        SqliteBookRepository,
    >,
}
