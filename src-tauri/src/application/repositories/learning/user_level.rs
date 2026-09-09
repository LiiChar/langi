use crate::{application::repositories::error::RepositoryError, domain::learning::UserLevel};


pub trait UserLevelRepository:
    Send + Sync
{
    fn insert(
        &self,
        level: &UserLevel,
    ) -> Result<(), RepositoryError>;

    fn upsert(
        &self,
        level: &UserLevel,
    ) -> Result<(), RepositoryError>;

    fn find(
        &self,
        user_id: &str,
    ) -> Result<UserLevel, RepositoryError>;
}
