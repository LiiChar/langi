use crate::{application::repositories::error::RepositoryError, domain::learning::BookReadingProgress};


pub trait BookReadingProgressRepository:
    Send + Sync
{
    fn insert(
        &self,
        progress: &BookReadingProgress,
    ) -> Result<(), RepositoryError>;

    fn upsert(
        &self,
        progress: &BookReadingProgress,
    ) -> Result<(), RepositoryError>;

    fn find(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<BookReadingProgress, RepositoryError>;

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<BookReadingProgress>, RepositoryError>;
}
