use crate::{
    application::repositories::{book::book::BookRepository, error::RepositoryError}, domain::Book,
};

#[derive(Debug, thiserror::Error)]
pub enum ImportBooksError {
    #[error("repository error: {0}")]
    Repository(#[from] RepositoryError),

    #[error("parser error: {0}")]
    Parser(String),

    #[error("scanner error: {0}")]
    Scanner(String),
}

pub struct ImportBooksService<R> {
    repository: R,
}

impl<R> ImportBooksService<R>
where
    R: BookRepository,
{
    pub fn new(
        repository: R,
    ) -> Self {
        Self {
            repository,
        }
    }

    pub fn import_book(
        &self,
        book: Book,
    ) -> Result<(), ImportBooksError> {
        self.repository
            .insert(&book)?;

        Ok(())
    }

    pub fn import_books(
        &self,
        books: &[Book],
    ) -> Result<(), ImportBooksError> {
        self.repository
            .insert_many(books)?;

        Ok(())
    }

    pub fn get_book(
        &self,
        id: &str,
    ) -> Result<Book, ImportBooksError> {
        Ok(
            self.repository
                .find_by_id(id)?
        )
    }

    pub fn get_books(
        &self,
    ) -> Result<Vec<Book>, ImportBooksError> {
        Ok(
            self.repository
                .find_all()?
        )
    }

    pub fn get_books_query(
        &self,
    ) -> Result<Vec<Book>, ImportBooksError> {
        Ok(
            self.repository
                .find_all()?
        )
    }
}
