use crate::{application::repositories::error::RepositoryError, domain::learning::UserSkill};


pub trait UserSkillRepository:
    Send + Sync
{
    fn insert(
        &self,
        skill: &UserSkill,
    ) -> Result<(), RepositoryError>;

    fn upsert(
        &self,
        user_id: &str,
        skill: &UserSkill,
    ) -> Result<(), RepositoryError>;

    fn find(
        &self,
        user_id: &str,
        skill_id: &str,
    ) -> Result<UserSkill, RepositoryError>;

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserSkill>, RepositoryError>;
}
