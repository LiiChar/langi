use crate::{application::repositories::error::RepositoryError, domain::learning::UserWord};


pub trait UserWordRepository:
    Send + Sync
{
    fn insert(
        &self,
        word: &UserWord,
    ) -> Result<(), RepositoryError>;

    fn upsert(
        &self,
        word: &UserWord,
    ) -> Result<(), RepositoryError>;

    fn find(
        &self,
        user_id: &str,
        word_id: &str,
    ) -> Result<UserWord, RepositoryError>;

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserWord>, RepositoryError>;

    fn find_due(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserWord>, RepositoryError>;

    fn delete(
        &self,
        user_id: &str,
        word_id: &str,
    ) -> Result<(), RepositoryError>;
}
