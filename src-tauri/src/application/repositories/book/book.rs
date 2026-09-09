use crate::{application::repositories::error::RepositoryError, domain::Book};


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
