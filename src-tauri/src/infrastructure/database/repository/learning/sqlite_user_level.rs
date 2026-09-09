use std::sync::{Arc, Mutex};

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    application::repositories::{
        error::RepositoryError, learning::user_level::UserLevelRepository,
    }, domain::learning::{CefrLevel, UserLevel},
};

pub struct SqliteUserLevelRepository {
    connection: Arc<Mutex<Connection>>,
}

impl SqliteUserLevelRepository {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    fn connection(
        &self,
    ) -> Result<std::sync::MutexGuard<'_, Connection>, RepositoryError> {
        self.connection
            .lock()
            .map_err(|_| {
                RepositoryError::DatabaseError(
                    rusqlite::Error::InvalidQuery.to_string(),
                )
            })
    }

    fn map_row(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<UserLevel> {
        let estimated_level: String = row.get(5)?;

        let estimated_level: CefrLevel =
            serde_json::from_str(&estimated_level)
                .map_err(|error| {
                    rusqlite::Error::FromSqlConversionFailure(
                        5,
                        rusqlite::types::Type::Text,
                        Box::new(error),
                    )
                })?;

        let updated_at: i64 = row.get(7)?;

        let updated_at =
            DateTime::<Utc>::from_timestamp(updated_at, 0)
                .ok_or_else(|| {
                    rusqlite::Error::FromSqlConversionFailure(
                        7,
                        rusqlite::types::Type::Integer,
                        Box::new(std::io::Error::new(
                            std::io::ErrorKind::InvalidData,
                            "invalid updated_at timestamp",
                        )),
                    )
                })?;

        Ok(UserLevel {
            user_id: row.get(0)?,

            vocabulary: row.get(1)?,
            grammar: row.get(2)?,
            reading: row.get(3)?,
            comprehension: row.get(4)?,

            estimated_level,

            confidence: row.get(6)?,

            updated_at,
        })
    }
}

impl UserLevelRepository for SqliteUserLevelRepository {
    fn insert(
        &self,
        level: &UserLevel,
    ) -> Result<(), RepositoryError> {
        let connection = self.connection()?;

        let estimated_level =
            serde_json::to_string(&level.estimated_level)
                .map_err(|error| -> RepositoryError {
                    RepositoryError::Serialization(error.to_string())
                })?;

        connection.execute(
            r#"
            INSERT INTO user_levels (
                user_id,

                vocabulary,
                grammar,
                reading,
                comprehension,

                estimated_level,
                confidence,

                updated_at
            )
            VALUES (
                ?1,
                ?2, ?3, ?4, ?5,
                ?6, ?7,
                ?8
            )
            "#,
            params![
                level.user_id,

                level.vocabulary,
                level.grammar,
                level.reading,
                level.comprehension,

                estimated_level,
                level.confidence,

                level.updated_at.timestamp(),
            ],
        ).map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        Ok(())
    }

    fn upsert(
        &self,
        level: &UserLevel,
    ) -> Result<(), RepositoryError> {
        let connection = self.connection()?;

        let estimated_level =
            serde_json::to_string(&level.estimated_level)
                .map_err(|error| {
                    RepositoryError::Serialization(error.to_string())
                })?;

        connection.execute(
            r#"
            INSERT INTO user_levels (
                user_id,

                vocabulary,
                grammar,
                reading,
                comprehension,

                estimated_level,
                confidence,

                updated_at
            )
            VALUES (
                ?1,
                ?2, ?3, ?4, ?5,
                ?6, ?7,
                ?8
            )
            ON CONFLICT (user_id)
            DO UPDATE SET
                vocabulary = excluded.vocabulary,
                grammar = excluded.grammar,
                reading = excluded.reading,
                comprehension = excluded.comprehension,

                estimated_level = excluded.estimated_level,
                confidence = excluded.confidence,

                updated_at = excluded.updated_at
            "#,
            params![
                level.user_id,

                level.vocabulary,
                level.grammar,
                level.reading,
                level.comprehension,

                estimated_level,
                level.confidence,

                level.updated_at.timestamp(),
            ],
        ).map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        Ok(())
    }

    fn find(
        &self,
        user_id: &str,
    ) -> Result<UserLevel, RepositoryError> {
        let connection = self.connection()?;

        let level = connection
            .query_row(
                r#"
                SELECT
                    user_id,

                    vocabulary,
                    grammar,
                    reading,
                    comprehension,

                    estimated_level,
                    confidence,

                    updated_at
                FROM user_levels
                WHERE user_id = ?1
                "#,
                params![user_id],
                Self::map_row,
            )
            .optional()
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        level.ok_or(RepositoryError::NotFound)
    }
}
