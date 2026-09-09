use std::sync::{Arc, Mutex};

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    application::repositories::{
        error::RepositoryError, learning::book_reading_progress::BookReadingProgressRepository,
    }, domain::learning::BookReadingProgress,
};

pub struct SqliteBookReadingProgressRepository {
    connection: Arc<Mutex<Connection>>,
}

impl SqliteBookReadingProgressRepository {
    pub fn new(connection: Arc<Mutex<Connection>>) -> Self {
        Self { connection }
    }

    fn map_row(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<BookReadingProgress> {
        let updated_at: i64 = row.get(10)?;

        let updated_at = DateTime::<Utc>::from_timestamp(updated_at, 0)
            .ok_or_else(|| {
                rusqlite::Error::FromSqlConversionFailure(
                    10,
                    rusqlite::types::Type::Integer,
                    Box::new(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        "invalid updated_at timestamp",
                    )),
                )
            })?;

        Ok(BookReadingProgress {
            user_id: row.get(0)?,
            book_id: row.get(1)?,

            chapters_started: row.get(2)?,
            chapters_completed: row.get(3)?,

            reading_seconds: row.get(4)?,
            paragraphs_seen: row.get(5)?,

            last_chapter_id: row.get(6)?,
            last_element_id: row.get(7)?,

            vocabulary_mastery: row.get(8)?,
            comprehension_mastery: row.get(9)?,

            updated_at,
        })
    }
}

impl BookReadingProgressRepository
    for SqliteBookReadingProgressRepository
{
    fn insert(
        &self,
        progress: &BookReadingProgress,
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

        connection.execute(
            r#"
            INSERT INTO book_reading_progress (
                user_id,
                book_id,

                chapters_started,
                chapters_completed,

                reading_seconds,
                paragraphs_seen,

                last_chapter_id,
                last_element_id,

                vocabulary_mastery,
                comprehension_mastery,

                updated_at
            )
            VALUES (
                ?1, ?2,
                ?3, ?4,
                ?5, ?6,
                ?7, ?8,
                ?9, ?10,
                ?11
            )
            "#,
            params![
                progress.user_id,
                progress.book_id,

                progress.chapters_started,
                progress.chapters_completed,

                progress.reading_seconds,
                progress.paragraphs_seen,

                progress.last_chapter_id,
                progress.last_element_id,

                progress.vocabulary_mastery,
                progress.comprehension_mastery,

                progress.updated_at.timestamp(),
            ],
        )            .map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        Ok(())
    }

    fn upsert(
        &self,
        progress: &BookReadingProgress,
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

        connection.execute(
            r#"
            INSERT INTO book_reading_progress (
                user_id,
                book_id,

                chapters_started,
                chapters_completed,

                reading_seconds,
                paragraphs_seen,

                last_chapter_id,
                last_element_id,

                vocabulary_mastery,
                comprehension_mastery,

                updated_at
            )
            VALUES (
                ?1, ?2,
                ?3, ?4,
                ?5, ?6,
                ?7, ?8,
                ?9, ?10,
                ?11
            )
            ON CONFLICT (user_id, book_id)
            DO UPDATE SET
                chapters_started = excluded.chapters_started,
                chapters_completed = excluded.chapters_completed,

                reading_seconds = excluded.reading_seconds,
                paragraphs_seen = excluded.paragraphs_seen,

                last_chapter_id = excluded.last_chapter_id,
                last_element_id = excluded.last_element_id,

                vocabulary_mastery = excluded.vocabulary_mastery,
                comprehension_mastery = excluded.comprehension_mastery,

                updated_at = excluded.updated_at
            "#,
            params![
                progress.user_id,
                progress.book_id,

                progress.chapters_started,
                progress.chapters_completed,

                progress.reading_seconds,
                progress.paragraphs_seen,

                progress.last_chapter_id,
                progress.last_element_id,

                progress.vocabulary_mastery,
                progress.comprehension_mastery,

                progress.updated_at.timestamp(),
            ],
        )            .map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        Ok(())
    }

    fn find(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<BookReadingProgress, RepositoryError> {
        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let progress = connection
            .query_row(
                r#"
                SELECT
                    user_id,
                    book_id,

                    chapters_started,
                    chapters_completed,

                    reading_seconds,
                    paragraphs_seen,

                    last_chapter_id,
                    last_element_id,

                    vocabulary_mastery,
                    comprehension_mastery,

                    updated_at
                FROM book_reading_progress
                WHERE user_id = ?1
                  AND book_id = ?2
                "#,
                params![user_id, book_id],
                Self::map_row,
            )
            .optional()            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        progress.ok_or(RepositoryError::NotFound)
    }

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<BookReadingProgress>, RepositoryError> {
        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let mut statement = connection.prepare(
            r#"
            SELECT
                user_id,
                book_id,

                chapters_started,
                chapters_completed,

                reading_seconds,
                paragraphs_seen,

                last_chapter_id,
                last_element_id,

                vocabulary_mastery,
                comprehension_mastery,

                updated_at
            FROM book_reading_progress
            WHERE user_id = ?1
            ORDER BY updated_at DESC
            "#,
        )            .map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        let rows = statement.query_map(
            params![user_id],
            Self::map_row,
        )            .map_err(|error| {
            RepositoryError::DatabaseError(
                error.to_string()
            )
        })?;

        let mut result = Vec::new();

        for row in rows {
            result.push(row            .map_err(|error| {
                RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?);
        }

        Ok(result)
    }
}
