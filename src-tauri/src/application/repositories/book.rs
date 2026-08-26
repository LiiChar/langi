use crate::domain::Book;

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("database error: {0}")]
    DatabaseError(String),

    #[error("entity not found")]
    NotFound,

    #[error("invalid input: {0}")]
    InvalidInput(String),
}

pub trait BookRepository: Send + Sync {
    fn insert(
        &self,
        book: &Book,
    ) -> Result<(), RepositoryError>;

    fn insert_many(
        &self,
        books: &[Book],
    ) -> Result<(), RepositoryError>;

    fn find_by_id(
        &self,
        id: &str,
    ) -> Result<Book, RepositoryError>;

    fn find_all(
        &self,
    ) -> Result<Vec<Book>, RepositoryError>;

    fn find_by_path(
        &self,
        path: &str,
    ) -> Result<Book, RepositoryError>;

    fn delete(
        &self,
        id: &str,
    ) -> Result<(), RepositoryError>;
}
