use crate::{application::repositories::error::RepositoryError, domain::learning::LearningEvent};


pub trait LearningEventRepository:
    Send + Sync
{
    fn insert(
        &self,
        event: &LearningEvent,
    ) -> Result<(), RepositoryError>;

    fn insert_many(
        &self,
        events: &[LearningEvent],
    ) -> Result<(), RepositoryError>;

    fn exists(
        &self,
        id: &str,
    ) -> Result<bool, RepositoryError>;

    fn find_by_id(
        &self,
        id: &str,
    ) -> Result<LearningEvent, RepositoryError>;

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<LearningEvent>, RepositoryError>;
}
