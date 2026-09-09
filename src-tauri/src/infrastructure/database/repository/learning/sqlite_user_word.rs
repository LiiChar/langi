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

use crate::{
    application::repositories::{error::RepositoryError, learning::user_word::UserWordRepository}, domain::learning::{UserWord, WordState},
};

#[derive(Clone)]
pub struct SqliteUserWordRepository {
    connection:
        Arc<Mutex<Connection>>,
}

impl SqliteUserWordRepository {
    pub fn new(
        connection:
            Arc<Mutex<Connection>>,
    ) -> Self {
        Self {
            connection,
        }
    }

    fn map_word(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<UserWord> {
        let state: String =
            row.get("state")?;

        let last_seen_at:
            Option<String> =
            row.get("last_seen_at")?;

        let first_seen_at:
            Option<String> =
            row.get("first_seen_at")?;

        let last_reviewed_at:
            Option<String> =
            row.get("last_reviewed_at")?;

        let next_review_at:
            Option<String> =
            row.get("next_review_at")?;

        Ok(UserWord {
            user_id:
                row.get("user_id")?,

            word_id:
                row.get("word_id")?,

            exposure_count:
                row.get("exposure_count")?,

            recognition:
                row.get("recognition")?,

            recall:
                row.get("recall")?,

            familiarity:
                row.get("familiarity")?,

            difficulty:
                row.get("difficulty")?,

            stability_days:
                row.get("stability_days")?,

            repetitions:
                row.get("repetitions")?,

            lapses:
                row.get("lapses")?,

            favorite:
                row.get("favorite")?,

            state:
                parse_word_state(
                    &state
                ),

            last_seen_at:
                parse_datetime(
                    last_seen_at
                ),

            first_seen_at:
                parse_datetime(
                    first_seen_at
                ),

            last_reviewed_at:
                parse_datetime(
                    last_reviewed_at
                ),

            next_review_at:
                parse_datetime(
                    next_review_at
                ),
        })
    }
}

fn parse_word_state(
    value: &str,
) -> WordState {
    match value {
        "new" =>
            WordState::New,

        "learning" =>
            WordState::Learning,

        "review" =>
            WordState::Review,

        "mastered" =>
            WordState::Mastered,

        "suspended" =>
            WordState::Suspended,

        _ =>
            WordState::New,
    }
}

fn word_state_to_string(
    state: &WordState,
) -> &'static str {
    match state {
        WordState::New =>
            "new",

        WordState::Learning =>
            "learning",

        WordState::Review =>
            "review",

        WordState::Mastered =>
            "mastered",

        WordState::Suspended =>
            "suspended",
    }
}

fn parse_datetime(
    value: Option<String>,
) -> Option<DateTime<Utc>> {
    value
        .and_then(|value| {
            DateTime::parse_from_rfc3339(
                &value
            )
            .ok()
            .map(|value| {
                value.with_timezone(&Utc)
            })
        })
}

impl UserWordRepository
    for SqliteUserWordRepository
{
    fn insert(
        &self,
        word: &UserWord,
    ) -> Result<(), RepositoryError> {
        self.upsert(word)
    }

    fn upsert(
        &self,
        word: &UserWord,
    ) -> Result<(), RepositoryError> {
        if word
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

        if word
            .word_id
            .trim()
            .is_empty()
        {
            return Err(
                RepositoryError::InvalidInput(
                    "word id is empty".into()
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

        connection
            .execute(
                "
                INSERT INTO user_words (
                    user_id,
                    word_id,
                    exposure_count,
                    recognition,
                    recall,
                    familiarity,
                    difficulty,
                    stability_days,
                    repetitions,
                    lapses,
                    favorite,
                    state,
                    last_seen_at,
                    last_reviewed_at,
                    next_review_at
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
                    ?11,
                    ?12,
                    ?13,
                    ?14,
                    ?15
                )
                ON CONFLICT (
                    user_id,
                    word_id
                )
                DO UPDATE SET
                    exposure_count =
                        excluded.exposure_count,

                    recognition =
                        excluded.recognition,

                    recall =
                        excluded.recall,

                    familiarity =
                        excluded.familiarity,

                    difficulty =
                        excluded.difficulty,

                    stability_days =
                        excluded.stability_days,

                    repetitions =
                        excluded.repetitions,

                    lapses =
                        excluded.lapses,

                    favorite =
                        excluded.favorite,

                    state =
                        excluded.state,

                    last_seen_at =
                        excluded.last_seen_at,

                    last_reviewed_at =
                        excluded.last_reviewed_at,

                    next_review_at =
                        excluded.next_review_at
                ",
                params![
                    word.user_id,
                    word.word_id,
                    word.exposure_count,
                    word.recognition,
                    word.recall,
                    word.familiarity,
                    word.difficulty,
                    word.stability_days,
                    word.repetitions,
                    word.lapses,
                    word.favorite,
                    word_state_to_string(
                        &word.state
                    ),
                    word.last_seen_at
                        .map(|value|
                            value.to_rfc3339()
                        ),
                    word.last_reviewed_at
                        .map(|value|
                            value.to_rfc3339()
                        ),
                    word.next_review_at
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
        word_id: &str,
    ) -> Result<UserWord, RepositoryError> {
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
                        word_id,
                        exposure_count,
                        recognition,
                        recall,
                        familiarity,
                        difficulty,
                        stability_days,
                        repetitions,
                        lapses,
                        favorite,
                        state,
                        last_seen_at,
                        last_reviewed_at,
                        next_review_at
                    FROM user_words
                    WHERE
                        user_id = ?1
                        AND word_id = ?2
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
                        word_id,
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

        Self::map_word(row)
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })
    }

    fn find_by_user(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserWord>, RepositoryError> {
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
                        word_id,
                        exposure_count,
                        recognition,
                        recall,
                        familiarity,
                        difficulty,
                        stability_days,
                        repetitions,
                        lapses,
                        favorite,
                        state,
                        last_seen_at,
                        last_reviewed_at,
                        next_review_at
                    FROM user_words
                    WHERE user_id = ?1
                    ORDER BY familiarity ASC
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let words =
            statement
                .query_map(
                    [user_id],
                    Self::map_word,
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

        Ok(words)
    }

    fn find_due(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserWord>, RepositoryError> {
        let now =
            Utc::now()
                .to_rfc3339();

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
                        word_id,
                        exposure_count,
                        recognition,
                        recall,
                        familiarity,
                        difficulty,
                        stability_days,
                        repetitions,
                        lapses,
                        favorite,
                        state,
                        last_seen_at,
                        last_reviewed_at,
                        next_review_at
                    FROM user_words
                    WHERE
                        user_id = ?1
                        AND state != 'suspended'
                        AND (
                            next_review_at IS NULL
                            OR next_review_at <= ?2
                        )
                    ORDER BY
                        next_review_at ASC
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let words =
            statement
                .query_map(
                    params![
                        user_id,
                        now,
                    ],
                    Self::map_word,
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

        Ok(words)
    }

    fn delete(
        &self,
        user_id: &str,
        word_id: &str,
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

        let affected =
            connection
                .execute(
                    "
                    DELETE FROM user_words
                    WHERE
                        user_id = ?1
                        AND word_id = ?2
                    ",
                    params![
                        user_id,
                        word_id,
                    ],
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        if affected == 0 {
            return Err(
                RepositoryError::NotFound
            );
        }

        Ok(())
    }
}
