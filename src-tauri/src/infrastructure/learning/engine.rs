use std::sync::{Arc, Mutex};

use chrono::{
    DateTime,
    Duration,
    Utc,
};
use rusqlite::Connection;

use crate::{
    application::repositories::{error::RepositoryError, learning::{book_reading_progress::BookReadingProgressRepository, learning_event::LearningEventRepository, user_level::UserLevelRepository, user_skill::UserSkillRepository, user_word::UserWordRepository}}, domain::learning::{
        BookReadingProgress,
        CefrLevel,
        LearningActivity,
        LearningEvent,
        LearningEventData,
        LearningEventType,
        UserLevel,
        UserSkill,
        UserWord,
        WordState,
    }, infrastructure::database::repository::{book::sqlite_book_reading_progress::SqliteBookReadingProgressRepository, learning::{sqlite_learning_event::SqliteLearningEventRepository, sqlite_user_level::SqliteUserLevelRepository, sqlite_user_skill::SqliteUserSkillRepository, sqlite_user_word::SqliteUserWordRepository}},
};

#[derive(Debug, thiserror::Error)]
pub enum LearningError {
    #[error("invalid learning event: {0}")]
    InvalidEvent(String),

    #[error("repository error: {0}")]
    Repository(#[from] RepositoryError),
}

pub struct LearningEngine {
    event_repository:
        Arc<dyn LearningEventRepository>,

    word_repository:
        Arc<dyn UserWordRepository>,

    skill_repository:
        Arc<dyn UserSkillRepository>,

    book_progress_repository:
        Arc<dyn BookReadingProgressRepository>,

    level_repository:
        Arc<dyn UserLevelRepository>,
}

impl LearningEngine {
    pub fn new(
        connection: Arc<Mutex<Connection>>
    ) -> Self {
        Self {
            event_repository: Arc::new(
                SqliteLearningEventRepository::new(
                    connection.clone(),
                )
            ),

            word_repository: Arc::new(
                SqliteUserWordRepository::new(
                    connection.clone(),
                )
            ),

            skill_repository: Arc::new(
                SqliteUserSkillRepository::new(
                    connection.clone(),
                )
            ),

            book_progress_repository: Arc::new(
                SqliteBookReadingProgressRepository::new(
                    connection.clone(),
                )
            ),

            level_repository: Arc::new(
                SqliteUserLevelRepository::new(
                    connection.clone(),
                )
            ),
        }
    }

    // ============================================================
    // EVENT
    // ============================================================

    pub fn process_event(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        if event.id.trim().is_empty() {
            return Err(
                LearningError::InvalidEvent(
                    "event id is empty".into(),
                ),
            );
        }

        if event.user_id.trim().is_empty() {
            return Err(
                LearningError::InvalidEvent(
                    "user id is empty".into(),
                ),
            );
        }

        // Идемпотентность.
        //
        // Если frontend повторно отправил событие,
        // мы не должны применить его второй раз.
        if self
            .event_repository
            .exists(&event.id)?
        {
            return Ok(());
        }

        match event.event_type {
            LearningEventType::WordSeen => {
                self.handle_word_seen(event)?;
            }

            LearningEventType::TranslationOpened => {
                self.handle_translation_opened(event)?;
            }

            LearningEventType::FavoriteAdded => {
                self.handle_favorite(event, true)?;
            }

            LearningEventType::FavoriteRemoved => {
                self.handle_favorite(event, false)?;
            }

            LearningEventType::MarkedKnown => {
                self.handle_marked_known(event)?;
            }

            LearningEventType::MarkedUnknown => {
                self.handle_marked_unknown(event)?;
            }

            LearningEventType::QuestionAnswered => {
                self.handle_question_answered(event)?;
            }

            LearningEventType::ExerciseStarted => {
                // Пока telemetry.
            }

            LearningEventType::ExerciseCompleted => {
                self.handle_exercise_completed(event)?;
            }

            LearningEventType::ExerciseSkipped => {
                // Пока telemetry.
            }

            LearningEventType::ChapterOpened => {
                self.handle_chapter_opened(event)?;
            }

            LearningEventType::ChapterCompleted => {
                self.handle_chapter_completed(event)?;
            }

            LearningEventType::ParagraphSeen => {
                self.handle_paragraph_seen(event)?;
            }

            LearningEventType::ReadingSessionStarted => {
                // Пока telemetry.
            }

            LearningEventType::ReadingSessionFinished => {
                self.handle_reading_session(event)?;
            }
        }

        self.recalculate_user_level(
            &event.user_id
        )?;

        // Event становится источником истины только
        // после успешного применения бизнес-логики.
        self.event_repository.insert(event)?;

        Ok(())
    }

    // ============================================================
    // WORD
    // ============================================================

    fn get_or_create_word(
        &self,
        user_id: &str,
        word_id: &str,
    ) -> Result<UserWord, LearningError> {
        match self.word_repository.find(
            user_id,
            word_id,
        ) {
            Ok(word) => Ok(word),

            Err(RepositoryError::NotFound) => {
                Ok(UserWord::new(
                    user_id.to_string(),
                    word_id.to_string(),
                ))
            }

            Err(error) => {
                Err(LearningError::Repository(
                    error,
                ))
            }
        }
    }

    fn handle_word_seen(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(word_id) =
            event.context.word_id.as_deref()
        else {
            return Ok(());
        };

        let mut word =
            self.get_or_create_word(
                &event.user_id,
                word_id,
            )?;

        word.exposure_count =
            word.exposure_count
                .saturating_add(1);

        //
        // Само появление слова на экране
        // немного улучшает recognition.
        //

        word.recognition +=
            0.015
            * (1.0 - word.recognition);

        word.recognition =
            word.recognition.clamp(
                0.0,
                1.0,
            );

        if word.first_seen_at.is_none() {
            word.first_seen_at =
                Some(event.timestamp);
        }

        word.last_seen_at =
            Some(event.timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.update_word_state(
            &mut word,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    fn handle_translation_opened(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(word_id) =
            event.context.word_id.as_deref()
        else {
            return Ok(());
        };

        let mut word =
            self.get_or_create_word(
                &event.user_id,
                word_id,
            )?;

        //
        // Открытие перевода — очень слабый
        // сигнал знания.
        //

        word.recognition +=
            0.005
            * (1.0 - word.recognition);

        word.recognition =
            word.recognition.clamp(
                0.0,
                1.0,
            );

        if word.first_seen_at.is_none() {
            word.first_seen_at =
                Some(event.timestamp);
        }

        word.last_seen_at =
            Some(event.timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.update_word_state(
            &mut word,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    fn handle_favorite(
        &self,
        event: &LearningEvent,
        favorite: bool,
    ) -> Result<(), LearningError> {
        let Some(word_id) =
            event.context.word_id.as_deref()
        else {
            return Ok(());
        };

        let mut word =
            self.get_or_create_word(
                &event.user_id,
                word_id,
            )?;

        word.favorite = favorite;

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    fn handle_marked_known(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(word_id) =
            event.context.word_id.as_deref()
        else {
            return Ok(());
        };

        let mut word =
            self.get_or_create_word(
                &event.user_id,
                word_id,
            )?;

        //
        // Ручная отметка пользователя —
        // сильный, но не абсолютный сигнал.
        //

        word.recognition =
            word.recognition.max(0.80);

        word.recall =
            word.recall.max(0.65);

        word.familiarity =
            word.familiarity.max(0.70);

        word.repetitions =
            word.repetitions.max(1);

        word.last_reviewed_at =
            Some(event.timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.update_word_state(
            &mut word,
        );

        self.schedule_after_manual_known(
            &mut word,
            event.timestamp,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    fn handle_marked_unknown(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(word_id) =
            event.context.word_id.as_deref()
        else {
            return Ok(());
        };

        let mut word =
            self.get_or_create_word(
                &event.user_id,
                word_id,
            )?;

        word.recognition *= 0.70;

        word.recall *= 0.55;

        word.familiarity *= 0.70;

        word.state =
            WordState::Learning;

        word.next_review_at =
            Some(event.timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    // ============================================================
    // QUESTIONS
    // ============================================================

    fn handle_question_answered(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::QuestionAnswered {
            correct,
            response_time_ms,
            word_ids,
            skill_ids,
            ..
        } = &event.data
        else {
            return Err(
                LearningError::InvalidEvent(
                    "question_answered event has invalid data"
                        .into(),
                ),
            );
        };

        //
        // Обновляем каждое слово,
        // которое проверял этот вопрос.
        //

        for word_id in word_ids {
            self.apply_word_answer(
                &event.user_id,
                word_id,
                *correct,
                *response_time_ms,
                event.timestamp,
            )?;
        }

        //
        // Обновляем навыки,
        // которые проверял вопрос.
        //

        for skill_id in skill_ids {
            self.apply_skill_answer(
                &event.user_id,
                skill_id,
                *correct,
                0.5,
                event.timestamp,
            )?;
        }

        //
        // Если skill пришёл только
        // в context, тоже учитываем.
        //

        if skill_ids.is_empty() {
            if let Some(skill_id) =
                event.context.skill_id.as_deref()
            {
                self.apply_skill_answer(
                    &event.user_id,
                    skill_id,
                    *correct,
                    0.5,
                    event.timestamp,
                )?;
            }
        }

        Ok(())
    }

    fn apply_word_answer(
        &self,
        user_id: &str,
        word_id: &str,
        correct: bool,
        response_time_ms: Option<u64>,
        timestamp: DateTime<Utc>,
    ) -> Result<(), LearningError> {
        let mut word =
            self.get_or_create_word(
                user_id,
                word_id,
            )?;

        if correct {
            //
            // Правильный ответ —
            // сильный сигнал recall.
            //

            word.recall +=
                0.15
                * (1.0 - word.recall);

            word.recognition +=
                0.08
                * (1.0 - word.recognition);

            word.repetitions += 1;

            //
            // Быстрый правильный ответ
            // говорит о более устойчивом знании.
            //

            if let Some(time) =
                response_time_ms
            {
                if time < 2_500 {
                    word.recall +=
                        0.04
                        * (1.0 - word.recall);
                }
            }
        } else {
            //
            // Ошибка — сильный отрицательный
            // сигнал для recall.
            //

            word.recall *= 0.65;

            word.recognition *= 0.90;

            word.lapses += 1;
        }

        word.recall =
            word.recall.clamp(
                0.0,
                1.0,
            );

        word.recognition =
            word.recognition.clamp(
                0.0,
                1.0,
            );

        word.last_reviewed_at =
            Some(timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.update_word_state(
            &mut word,
        );

        let rating =
            review_rating(
                correct,
                response_time_ms,
            );

        self.apply_review_schedule(
            &mut word,
            rating,
            timestamp,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    // ============================================================
    // SKILLS
    // ============================================================

    fn apply_skill_answer(
        &self,
        user_id: &str,
        skill_id: &str,
        correct: bool,
        difficulty: f64,
        timestamp: DateTime<Utc>,
    ) -> Result<(), LearningError> {
        let mut skill =
            match self.skill_repository.find(
                user_id,
                skill_id,
            ) {
                Ok(skill) => skill,

                Err(RepositoryError::NotFound) => {
                    UserSkill::new(
                        user_id.to_string(),
                        skill_id.to_string(),
                    )
                }

                Err(error) => {
                    return Err(
                        LearningError::Repository(
                            error
                        )
                    );
                }
            };

        skill.attempts += 1;

        if correct {
            skill.correct += 1;
        }

        //
        // Exponential moving average.
        //
        // Первые ответы имеют больший вес,
        // после накопления истории изменения
        // становятся плавнее.
        //

        let alpha =
            if skill.attempts <= 5 {
                0.25
            } else {
                0.10
            };

        let target =
            if correct {
                1.0
                    - difficulty
                    * 0.25
            } else {
                difficulty
                    * 0.20
            };

        skill.mastery +=
            (target - skill.mastery)
            * alpha;

        skill.mastery =
            skill.mastery.clamp(
                0.0,
                1.0,
            );

        //
        // Чем больше наблюдений,
        // тем выше confidence.
        //

        skill.confidence =
            (skill.attempts as f64
                / 20.0)
                .min(1.0);

        skill.last_activity_at =
            Some(timestamp);

        self.skill_repository.upsert(
            user_id,
            &skill,
        )?;

        Ok(())
    }

    // ============================================================
    // EXERCISES
    // ============================================================

    fn handle_exercise_completed(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::ExerciseCompleted {
            correct,
            total,
            skill_ids,
            word_ids,
            duration_ms: _,
        } = &event.data
        else {
            return Err(
                LearningError::InvalidEvent(
                    "exercise_completed event has invalid data"
                        .into(),
                ),
            );
        };

        if *total == 0 {
            return Err(
                LearningError::InvalidEvent(
                    "exercise total is zero".into(),
                ),
            );
        }

        let accuracy =
            *correct as f64
                / *total as f64;

        //
        // Упражнение может проверять
        // несколько skills.
        //

        for skill_id in skill_ids {
            self.apply_skill_exercise_result(
                &event.user_id,
                skill_id,
                accuracy,
                event.timestamp,
            )?;
        }

        //
        // Если упражнение связано со словами,
        // тоже учитываем результат.
        //

        for word_id in word_ids {
            let correct_answer =
                accuracy >= 0.5;

            self.apply_word_answer(
                &event.user_id,
                word_id,
                correct_answer,
                None,
                event.timestamp,
            )?;
        }

        Ok(())
    }

    fn apply_skill_exercise_result(
        &self,
        user_id: &str,
        skill_id: &str,
        accuracy: f64,
        timestamp: DateTime<Utc>,
    ) -> Result<(), LearningError> {
        let mut skill =
            match self.skill_repository.find(
                user_id,
                skill_id,
            ) {
                Ok(skill) => skill,

                Err(RepositoryError::NotFound) => {
                    UserSkill::new(
                        user_id.to_string(),
                        skill_id.to_string(),
                    )
                }

                Err(error) => {
                    return Err(
                        LearningError::Repository(
                            error
                        )
                    );
                }
            };

        skill.attempts += 1;

        if accuracy >= 0.5 {
            skill.correct += 1;
        }

        let difficulty =
            1.0 - accuracy;

        let target =
            if accuracy >= 0.5 {
                1.0
                    - difficulty
                    * 0.25
            } else {
                difficulty
                    * 0.20
            };

        let alpha =
            if skill.attempts <= 5 {
                0.25
            } else {
                0.10
            };

        skill.mastery +=
            (target - skill.mastery)
            * alpha;

        skill.mastery =
            skill.mastery.clamp(
                0.0,
                1.0,
            );

        skill.confidence =
            (skill.attempts as f64
                / 20.0)
                .min(1.0);

        skill.last_activity_at =
            Some(timestamp);

        self.skill_repository.upsert(
            user_id,
            &skill,
        )?;

        Ok(())
    }

    // ============================================================
    // BOOK
    // ============================================================

    fn handle_chapter_opened(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(book_id) =
            event.context.book_id.as_deref()
        else {
            return Ok(());
        };

        let mut progress =
            self.get_or_create_book_progress(
                &event.user_id,
                book_id,
            )?;

        progress.chapters_started += 1;

        progress.last_chapter_id =
            event.context
                .chapter_id
                .clone();

        progress.updated_at =
            event.timestamp;

        self.book_progress_repository
            .upsert(
                &progress
            )?;

        Ok(())
    }

    fn handle_chapter_completed(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(book_id) =
            event.context.book_id.as_deref()
        else {
            return Ok(());
        };

        let mut progress =
            self.get_or_create_book_progress(
                &event.user_id,
                book_id,
            )?;

        progress.chapters_completed += 1;

        progress.last_chapter_id =
            event.context
                .chapter_id
                .clone();

        progress.updated_at =
            event.timestamp;

        self.book_progress_repository
            .upsert(
                &progress
            )?;

        Ok(())
    }

    fn handle_paragraph_seen(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let Some(book_id) =
            event.context.book_id.as_deref()
        else {
            return Ok(());
        };

        let mut progress =
            self.get_or_create_book_progress(
                &event.user_id,
                book_id,
            )?;

        progress.paragraphs_seen += 1;

        progress.last_element_id =
            event.context
                .element_id
                .clone();

        progress.updated_at =
            event.timestamp;

        self.book_progress_repository
            .upsert(
                &progress
            )?;

        Ok(())
    }

    fn handle_reading_session(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::ReadingSession {
            seconds,
            paragraphs_seen,
        } = &event.data
        else {
            return Err(
                LearningError::InvalidEvent(
                    "reading session has invalid data"
                        .into(),
                ),
            );
        };

        let Some(book_id) =
            event.context.book_id.as_deref()
        else {
            return Ok(());
        };

        let mut progress =
            self.get_or_create_book_progress(
                &event.user_id,
                book_id,
            )?;

        progress.reading_seconds +=
            *seconds as i64;

        progress.paragraphs_seen +=
            *paragraphs_seen as i64;

        progress.updated_at =
            event.timestamp;

        self.book_progress_repository
            .upsert(
                &progress
            )?;

        Ok(())
    }

    fn get_or_create_book_progress(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<
        BookReadingProgress,
        LearningError,
    > {
        match self.book_progress_repository
            .find(
                user_id,
                book_id,
            )
        {
            Ok(progress) => {
                Ok(progress)
            }

            Err(RepositoryError::NotFound) => {
                Ok(
                    BookReadingProgress::new(
                        user_id.to_string(),
                        book_id.to_string(),
                    )
                )
            }

            Err(error) => {
                Err(
                    LearningError::Repository(
                        error
                    )
                )
            }
        }
    }

    // ============================================================
    // WORD KNOWLEDGE
    // ============================================================

    fn update_word_familiarity(
        &self,
        word: &mut UserWord,
    ) {
        let exposure =
            1.0
                - (-word.exposure_count
                    as f64
                    / 8.0)
                    .exp();

        word.familiarity =
            (
                word.recognition
                    * 0.35

                + word.recall
                    * 0.45

                + exposure
                    * 0.20
            )
            .clamp(
                0.0,
                1.0,
            );
    }

    fn update_word_state(
        &self,
        word: &mut UserWord,
    ) {
        if matches!(
            word.state,
            WordState::Suspended
        ) {
            return;
        }

        if word.recall >= 0.90
            && word.recognition >= 0.90
            && word.repetitions >= 4
            && word.stability_days >= 30.0
        {
            word.state =
                WordState::Mastered;

            return;
        }

        if word.repetitions > 0 {
            word.state =
                WordState::Review;

            return;
        }

        if word.familiarity >= 0.35 {
            word.state =
                WordState::Learning;

            return;
        }

        word.state =
            WordState::New;
    }

    // ============================================================
    // SPACED REPETITION
    // ============================================================

    fn apply_review_schedule(
        &self,
        word: &mut UserWord,
        rating: ReviewRating,
        timestamp: DateTime<Utc>,
    ) {
        match rating {
            ReviewRating::Again => {
                word.difficulty =
                    (
                        word.difficulty
                            + 0.08
                    )
                    .clamp(
                        0.0,
                        1.0,
                    );

                word.stability_days =
                    (
                        word.stability_days
                            * 0.25
                    )
                    .max(0.25);

                word.next_review_at =
                    Some(
                        timestamp
                            + days(
                                word.stability_days
                            )
                    );
            }

            ReviewRating::Hard => {
                word.difficulty =
                    (
                        word.difficulty
                            + 0.03
                    )
                    .clamp(
                        0.0,
                        1.0,
                    );

                word.stability_days =
                    (
                        word.stability_days
                            * 1.35
                    )
                    .max(1.0);

                word.next_review_at =
                    Some(
                        timestamp
                            + days(
                                word.stability_days
                            )
                    );
            }

            ReviewRating::Good => {
                word.difficulty =
                    (
                        word.difficulty
                            - 0.01
                    )
                    .clamp(
                        0.0,
                        1.0,
                    );

                let multiplier =
                    2.2
                        + (
                            1.0
                                - word.difficulty
                        )
                        * 0.8;

                word.stability_days =
                    (
                        word.stability_days
                            * multiplier
                    )
                    .max(1.0);

                word.next_review_at =
                    Some(
                        timestamp
                            + days(
                                word.stability_days
                            )
                    );
            }

            ReviewRating::Easy => {
                word.difficulty =
                    (
                        word.difficulty
                            - 0.05
                    )
                    .clamp(
                        0.0,
                        1.0,
                    );

                let multiplier =
                    3.5
                        + (
                            1.0
                                - word.difficulty
                        );

                word.stability_days =
                    (
                        word.stability_days
                            * multiplier
                    )
                    .max(2.0);

                word.next_review_at =
                    Some(
                        timestamp
                            + days(
                                word.stability_days
                            )
                    );
            }
        }
    }

    fn schedule_after_manual_known(
        &self,
        word: &mut UserWord,
        timestamp: DateTime<Utc>,
    ) {
        word.next_review_at =
            Some(
                timestamp
                    + Duration::days(1)
            );
    }

    // ============================================================
    // LEVEL
    // ============================================================

    fn recalculate_user_level(
        &self,
        user_id: &str,
    ) -> Result<(), LearningError> {
        let words =
            self.word_repository
                .find_by_user(user_id)?;

        let skills =
            self.skill_repository
                .find_by_user(user_id)?;

        let books =
            self.book_progress_repository
                .find_by_user(user_id)?;

        let vocabulary =
            calculate_vocabulary_score(
                &words,
            );

        let grammar =
            calculate_skill_group_score(
                &skills,
                "grammar.",
            );

        let comprehension =
            calculate_skill_group_score(
                &skills,
                "comprehension.",
            );

        let reading =
            calculate_reading_score(
                &books,
            );

        let overall =
            vocabulary
                * 0.40

            + grammar
                * 0.20

            + comprehension
                * 0.25

            + reading
                * 0.15;

        let confidence =
            calculate_level_confidence(
                &words,
                &skills,
            );

        let level =
            UserLevel {
                user_id:
                    user_id.to_string(),

                vocabulary,
                grammar,
                reading,
                comprehension,

                estimated_level:
                    score_to_cefr(
                        overall
                    ),

                confidence,

                updated_at:
                    Utc::now(),
            };

        self.level_repository
            .upsert(
                &level
            )?;

        Ok(())
    }

    // ============================================================
    // NEXT ACTIVITY
    // ============================================================

    pub fn next_activity(
        &self,
        user_id: &str,
    ) -> Result<
        LearningActivity,
        LearningError,
    > {
        let due =
            self.word_repository
                .find_due(user_id)?;

        if !due.is_empty() {
            let mut due = due;

            due.sort_by(|a, b| {
                word_priority(b)
                    .partial_cmp(
                        &word_priority(a)
                    )
                    .unwrap_or(
                        std::cmp::Ordering::Equal
                    )
            });

            let word_ids =
                due.iter()
                    .take(8)
                    .map(|word| {
                        word.word_id.clone()
                    })
                    .collect();

            return Ok(
                LearningActivity::WordReview {
                    word_ids,

                    reason:
                        "Есть слова, которые пора повторить."
                            .into(),
                }
            );
        }

        let skills =
            self.skill_repository
                .find_by_user(user_id)?;

        let weakest =
            skills
                .iter()
                .filter(|skill| {
                    skill.confidence >= 0.2
                })
                .min_by(|a, b| {
                    a.mastery
                        .partial_cmp(
                            &b.mastery
                        )
                        .unwrap_or(
                            std::cmp::Ordering::Equal
                        )
                });

        if let Some(skill) =
            weakest
        {
            return Ok(
                LearningActivity::SkillExercise {
                    skill_id:
                        skill.skill_id.clone(),

                    reason:
                        "Это один из наиболее слабых навыков."
                            .into(),
                }
            );
        }

        let books =
            self.book_progress_repository
                .find_by_user(user_id)?;

        if let Some(book) =
            books.first()
        {
            let chapter_id =
                book.last_chapter_id
                    .clone()
                    .unwrap_or_default();

            return Ok(
                LearningActivity::ContinueReading {
                    book_id:
                        book.book_id.clone(),

                    chapter_id,

                    reason:
                        "Нет срочных повторений, можно продолжить чтение."
                            .into(),
                }
            );
        }

        Ok(
            LearningActivity::Rest {
                reason:
                    "Недостаточно данных для персонализации."
                        .into(),
            }
        )
    }
}

//
// HELPERS
//

#[derive(
    Debug,
    Clone,
    Copy,
)]
enum ReviewRating {
    Again,
    Hard,
    Good,
    Easy,
}

fn review_rating(
    correct: bool,
    response_time_ms: Option<u64>,
) -> ReviewRating {
    if !correct {
        return ReviewRating::Again;
    }

    match response_time_ms {
        Some(time) if time < 2_500 => {
            ReviewRating::Easy
        }

        Some(time) if time < 6_000 => {
            ReviewRating::Good
        }

        _ => {
            ReviewRating::Hard
        }
    }
}

fn days(days: f64) -> Duration {
    Duration::seconds(
        (days * 86_400.0)
            .max(1.0)
            as i64,
    )
}

fn word_priority(
    word: &UserWord,
) -> f64 {
    let now =
        Utc::now();

    let overdue_days =
        match word.next_review_at {
            Some(next) => {
                (now - next)
                    .num_seconds()
                    .max(0)
                    as f64
                    / 86_400.0
            }

            None => 30.0,
        };

    let weakness =
        1.0
            - word.familiarity;

    let favorite_bonus =
        if word.favorite {
            0.2
        } else {
            0.0
        };

    overdue_days
        * 0.6

        + weakness
            * 0.3

        + favorite_bonus
            * 0.1
}

fn calculate_vocabulary_score(
    words: &[UserWord],
) -> f64 {
    if words.is_empty() {
        return 0.0;
    }

    words
        .iter()
        .map(|word| {
            word.familiarity
        })
        .sum::<f64>()
        / words.len() as f64
}

fn calculate_skill_group_score(
    skills: &[UserSkill],
    prefix: &str,
) -> f64 {
    let relevant: Vec<_> =
        skills
            .iter()
            .filter(|skill| {
                skill.skill_id
                    .starts_with(prefix)
            })
            .collect();

    if relevant.is_empty() {
        return 0.0;
    }

    let weighted_sum =
        relevant
            .iter()
            .map(|skill| {
                skill.mastery
                    * skill.confidence
            })
            .sum::<f64>();

    let weights =
        relevant
            .iter()
            .map(|skill| {
                skill.confidence
            })
            .sum::<f64>();

    if weights <= 0.0 {
        return 0.0;
    }

    (
        weighted_sum
            / weights
    )
    .clamp(
        0.0,
        1.0,
    )
}

fn calculate_reading_score(
    books: &[BookReadingProgress],
) -> f64 {
    if books.is_empty() {
        return 0.0;
    }

    let started =
        books
            .iter()
            .map(|book| {
                book.chapters_started
            })
            .sum::<i64>();

    let completed =
        books
            .iter()
            .map(|book| {
                book.chapters_completed
            })
            .sum::<i64>();

    if started <= 0 {
        return 0.0;
    }

    (
        completed as f64
            / started as f64
    )
    .clamp(
        0.0,
        1.0,
    )
}

fn calculate_level_confidence(
    words: &[UserWord],
    skills: &[UserSkill],
) -> f64 {
    let word_confidence =
        if words.is_empty() {
            0.0
        } else {
            let reviewed =
                words
                    .iter()
                    .filter(|word| {
                        word.repetitions > 0
                    })
                    .count();

            (
                reviewed as f64
                    / words.len() as f64
            )
            .min(1.0)
        };

    let skill_confidence =
        if skills.is_empty() {
            0.0
        } else {
            skills
                .iter()
                .map(|skill| {
                    skill.confidence
                })
                .sum::<f64>()
                / skills.len() as f64
        };

    (
        word_confidence
            * 0.6

        + skill_confidence
            * 0.4
    )
    .clamp(
        0.0,
        1.0,
    )
}

fn score_to_cefr(
    score: f64,
) -> CefrLevel {
    match score {
        x if x < 0.18 =>
            CefrLevel::A1,

        x if x < 0.35 =>
            CefrLevel::A2,

        x if x < 0.52 =>
            CefrLevel::B1,

        x if x < 0.68 =>
            CefrLevel::B2,

        x if x < 0.84 =>
            CefrLevel::C1,

        _ =>
            CefrLevel::C2,
    }
}
