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

use crate::{application::repositories::{error::RepositoryError, learning::learning_event::LearningEventRepository}, domain::learning::{LearningEvent, LearningEventContext, LearningEventData, LearningEventType}};



#[derive(Clone)]
pub struct SqliteLearningEventRepository {
    connection:
        Arc<Mutex<Connection>>,
}

impl SqliteLearningEventRepository {
    pub fn new(
        connection:
            Arc<Mutex<Connection>>,
    ) -> Self {
        Self {
            connection,
        }
    }

    fn map_event(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<LearningEvent> {
        let timestamp: String =
            row.get("timestamp")?;

        let event_type: String =
            row.get("event_type")?;

        let data: String =
            row.get("data")?;

        Ok(LearningEvent {
            id: row.get("id")?,
            user_id: row.get("user_id")?,

            event_type: serde_json::from_str(&event_type)
                .unwrap_or(LearningEventType::WordSeen),

            timestamp:
                DateTime::parse_from_rfc3339(
                    &timestamp
                )
                .map(|value| {
                    value.with_timezone(&Utc)
                })
                .unwrap_or_else(|_| {
                    Utc::now()
                }),

            context: LearningEventContext {
                book_id:
                    row.get("book_id")?,

                chapter_id:
                    row.get("chapter_id")?,

                element_id:
                    row.get("element_id")?,

                word_id:
                    row.get("word_id")?,

                exercise_id:
                    row.get("exercise_id")?,

                question_id:
                    row.get("question_id")?,

                skill_id:
                    row.get("skill_id")?,
            },
            data: serde_json::from_str(&data)
                    .unwrap_or(
                        LearningEventData::Empty
                    ),
        })
    }

    fn validate_event(
        event: &LearningEvent,
    ) -> Result<(), RepositoryError> {
        if event.id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "event id is empty".into()
                )
            );
        }

        if event
            .user_id
            .trim()
            .is_empty()
        {
            return Err(
                RepositoryError::InvalidInput(
                    "user id is empty".into()
                )
            );
        }

        Ok(())
    }

    fn insert_event(
        transaction:
            &rusqlite::Transaction<'_>,
        event: &LearningEvent,
    ) -> Result<(), RepositoryError> {
        let event_type =
            serde_json::to_string(
                &event.event_type,
            )
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?
            .trim_matches('"')
            .to_string();

        let data =
            serde_json::to_string(
                &event.data,
            )
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        transaction
            .execute(
                "
                INSERT INTO learning_events (
                    id,
                    user_id,
                    event_type,
                    timestamp,
                    book_id,
                    chapter_id,
                    element_id,
                    word_id,
                    exercise_id,
                    skill_id,
                    data
                )
                VALUES (
                    ?1,
                    ?2,
                    ?3,
                    ?4,
                    ?5,
                    ?6,
                    ?7,
                    ?8,
                    ?9,
                    ?10,
                    ?11
                )
                ",
                params![
                    event.id,
                    event.user_id,
                    event_type,
                    event.timestamp
                        .to_rfc3339(),
                    event.context.book_id,
                    event.context.chapter_id,
                    event.context.element_id,
                    event.context.word_id,
                    event.context.exercise_id,
                    event.context.skill_id,
                    data,
                ],
            )
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        Ok(())
    }
}

impl LearningEventRepository
    for SqliteLearningEventRepository
{
    fn insert(
        &self,
        event: &LearningEvent,
    ) -> Result<(), RepositoryError> {
        Self::validate_event(event)?;

        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let transaction =
            connection
                .unchecked_transaction()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        Self::insert_event(
            &transaction,
            event,
        )?;

        transaction
            .commit()
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        Ok(())
    }

    fn insert_many(
        &self,
        events: &[LearningEvent],
    ) -> Result<(), RepositoryError> {
        if events.is_empty() {
            return Ok(());
        }

        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let transaction =
            connection
                .unchecked_transaction()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        for event in events {
            Self::validate_event(event)?;

            Self::insert_event(
                &transaction,
                event,
            )?;
        }

        transaction
            .commit()
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        Ok(())
    }

    fn exists(
        &self,
        id: &str,
    ) -> Result<bool, RepositoryError> {
        if id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "event id is empty".into()
                )
            );
        }

        let connection =
            self.connection
                .lock()
                .map_err(|_| {
                    RepositoryError::DatabaseError(
                        "failed to lock database"
                            .into()
                    )
                })?;

        let exists: bool =
            connection
                .query_row(
                    "
                    SELECT EXISTS (
                        SELECT 1
                        FROM learning_events
                        WHERE id = ?1
                    )
                    ",
                    [id],
                    |row| row.get(0),
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        Ok(exists)
    }

    fn find_by_id(
        &self,
        id: &str,
    ) -> Result<LearningEvent, RepositoryError> {
        if id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "event id is empty".into()
                )
            );
        }

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
                        id,
                        user_id,
                        event_type,
                        timestamp,
                        book_id,
                        chapter_id,
                        element_id,
                        word_id,
                        exercise_id,
                        skill_id,
                        data
                    FROM learning_events
                    WHERE id = ?1
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let mut rows =
            statement
                .query([id])
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

        Self::map_event(row)
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })
    }

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<LearningEvent>, RepositoryError> {
        if user_id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "user id is empty".into()
                )
            );
        }

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
                        id,
                        user_id,
                        event_type,
                        timestamp,
                        book_id,
                        chapter_id,
                        element_id,
                        word_id,
                        exercise_id,
                        skill_id,
                        data
                    FROM learning_events
                    WHERE user_id = ?1
                    ORDER BY timestamp ASC
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let events =
            statement
                .query_map(
                    [user_id],
                    Self::map_event,
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

        Ok(events)
    }
}
