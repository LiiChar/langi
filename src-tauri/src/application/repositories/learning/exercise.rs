use crate::{application::repositories::error::RepositoryError, domain::learning::Exercise};

pub trait ExerciseRepository:
    Send + Sync
{
    fn upsert(
        &self,
        exercise: &Exercise,
    ) -> Result<(), RepositoryError>;

    fn find(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<Exercise, RepositoryError>;

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<Exercise>, RepositoryError>;
}
