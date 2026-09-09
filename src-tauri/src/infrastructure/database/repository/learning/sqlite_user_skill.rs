use std::sync::{
    Arc,
    Mutex,
};

use chrono::{
    DateTime,
    Utc,
};

use rusqlite::{
    params,
    Connection,
};

use crate::{application::repositories::{error::RepositoryError, learning::user_skill::UserSkillRepository}, domain::learning::UserSkill};


#[derive(Clone)]
pub struct SqliteUserSkillRepository {
    connection:
        Arc<Mutex<Connection>>,
}

impl SqliteUserSkillRepository {
    pub fn new(
        connection:
            Arc<Mutex<Connection>>,
    ) -> Self {
        Self {
            connection,
        }
    }

    fn map_skill(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<UserSkill> {
        let last_activity_at:
            Option<String> =
            row.get("last_activity_at")?;

        Ok(UserSkill {
            user_id:
                row.get("user_id")?,

            skill_id:
                row.get("skill_id")?,

            mastery:
                row.get("mastery")?,

            confidence:
                row.get("confidence")?,

            attempts:
                row.get("attempts")?,

            correct:
                row.get("correct")?,

            last_activity_at:
                last_activity_at
                    .and_then(|value| {
                        DateTime::parse_from_rfc3339(
                            &value
                        )
                        .ok()
                        .map(|value| {
                            value
                                .with_timezone(
                                    &Utc
                                )
                        })
                    }),
        })
    }
}

impl UserSkillRepository
    for SqliteUserSkillRepository
{
    fn insert(
        &self,
        skill: &UserSkill,
    ) -> Result<(), RepositoryError> {
        self.upsert(&skill.user_id, skill)
    }

    fn upsert(
        &self,
        user_id: &str,
        skill: &UserSkill,
    ) -> Result<(), RepositoryError> {
        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        connection
            .execute(
                "
                INSERT INTO user_skills (
                    user_id,
                    skill_id,
                    mastery,
                    confidence,
                    attempts,
                    correct,
                    last_activity_at
                )
                VALUES (
                    ?1,
                    ?2,
                    ?3,
                    ?4,
                    ?5,
                    ?6,
                    ?7
                )
                ON CONFLICT (
                    user_id,
                    skill_id
                )
                DO UPDATE SET
                    mastery =
                        excluded.mastery,

                    confidence =
                        excluded.confidence,

                    attempts =
                        excluded.attempts,

                    correct =
                        excluded.correct,

                    last_activity_at =
                        excluded.last_activity_at
                ",
                params![
                    skill.user_id,
                    skill.skill_id,
                    skill.mastery,
                    skill.confidence,
                    skill.attempts,
                    skill.correct,
                    skill.last_activity_at
                        .map(|value|
                            value.to_rfc3339()
                        ),
                ],
            )
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        Ok(())
    }

    fn find(
        &self,
        user_id: &str,
        skill_id: &str,
    ) -> Result<UserSkill, RepositoryError> {
        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let mut statement =
            connection
                .prepare(
                    "
                    SELECT
                        user_id,
                        skill_id,
                        mastery,
                        confidence,
                        attempts,
                        correct,
                        last_activity_at
                    FROM user_skills
                    WHERE
                        user_id = ?1
                        AND skill_id = ?2
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let mut rows =
            statement
                .query(
                    params![
                        user_id,
                        skill_id,
                    ],
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let row =
            rows.next()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let Some(row) = row else {
            return Err(
                RepositoryError::NotFound
            );
        };

        Self::map_skill(row)
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })
    }

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserSkill>, RepositoryError> {
        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let mut statement =
            connection
                .prepare(
                    "
                    SELECT
                        user_id,
                        skill_id,
                        mastery,
                        confidence,
                        attempts,
                        correct,
                        last_activity_at
                    FROM user_skills
                    WHERE user_id = ?1
                    ORDER BY mastery ASC
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let skills =
            statement
                .query_map(
                    [user_id],
                    Self::map_skill,
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?
                .collect::<
                    Result<Vec<_>, _>
                >()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        Ok(skills)
    }
}
