use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
};

use chrono::{
    DateTime,
    Duration,
    Utc,
};

use rusqlite::Connection;
use crate::domain::config::LearningConfig;

use crate::{
    application::repositories::{
        error::RepositoryError,
        learning::{
            book_reading_progress::BookReadingProgressRepository,
            learning_event::LearningEventRepository,
            user_level::UserLevelRepository,
            user_skill::UserSkillRepository,
            user_word::UserWordRepository,
        },
    },

    domain::learning::{
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
    },

    infrastructure::database::repository::{
        book::sqlite_book_reading_progress::SqliteBookReadingProgressRepository,

        learning::{
            sqlite_learning_event::SqliteLearningEventRepository,
            sqlite_user_level::SqliteUserLevelRepository,
            sqlite_user_skill::SqliteUserSkillRepository,
            sqlite_user_word::SqliteUserWordRepository,
        },
    },
};

//
// ============================================================
// CONFIG
// ============================================================
//

/// Минимальное количество прочитанных абзацев
/// между двумя learning-активностями.
const MIN_PARAGRAPHS_BETWEEN_ACTIVITIES: u32 = 4;

/// Сколько последних активностей учитываем
/// при выборе следующей.
const RECENT_ACTIVITY_LIMIT: usize = 4;

/// Первый review после осознанного открытия перевода.
const INITIAL_REVIEW_DELAY_MINUTES: i64 = 20;

//
// ============================================================
// ERROR
// ============================================================
//

#[derive(Debug, thiserror::Error)]
pub enum LearningError {
    #[error("invalid learning event: {0}")]
    InvalidEvent(String),

    #[error("repository error: {0}")]
    Repository(#[from] RepositoryError),
}

//
// ============================================================
// SCHEDULER
// ============================================================
//

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ActivityKind {
    WordReview,
    Translation,
    SkillExercise,
    ComprehensionExercise,
}

#[derive(Debug)]
struct SchedulerState {
    paragraphs_since_activity: u32,
    activities_this_session: usize,

    recent_activities:
        VecDeque<ActivityKind>,
}

impl Default for SchedulerState {
    fn default() -> Self {
        Self {
            paragraphs_since_activity: 0,
            activities_this_session: 0,
            recent_activities: VecDeque::new(),
        }
    }
}

//
// ============================================================
// LEARNING ENGINE
// ============================================================
//

#[derive(Clone)]
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

    //
    // Runtime scheduler state.
    //
    // В дальнейшем его можно вынести в SQLite,
    // но для текущей версии этого достаточно.
    //
    scheduler:
        Arc<Mutex<SchedulerState>>,
}

impl LearningEngine {
    pub fn exercise_events_for_book(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<Vec<LearningEvent>, LearningError> {
        Ok(self.event_repository.find_by_user_and_book(user_id, book_id)?
            .into_iter()
            .filter(|event| matches!(
                &event.event_type,
                LearningEventType::ExerciseStarted
                    | LearningEventType::QuestionAnswered
                    | LearningEventType::ExerciseCompleted
            ))
            .collect())
    }

    pub fn overview(&self, user_id: &str) -> Result<(Vec<UserWord>, Vec<UserSkill>, Vec<BookReadingProgress>), LearningError> {
        Ok((
            self.word_repository.find_by_user(user_id)?,
            self.skill_repository.find_by_user(user_id)?,
            self.book_progress_repository.find_by_user(user_id)?,
        ))
    }

    pub fn new(
        connection: Arc<Mutex<Connection>>,
    ) -> Self {
        Self {
            event_repository: Arc::new(
                SqliteLearningEventRepository::new(
                    connection.clone(),
                ),
            ),

            word_repository: Arc::new(
                SqliteUserWordRepository::new(
                    connection.clone(),
                ),
            ),

            skill_repository: Arc::new(
                SqliteUserSkillRepository::new(
                    connection.clone(),
                ),
            ),

            book_progress_repository: Arc::new(
                SqliteBookReadingProgressRepository::new(
                    connection.clone(),
                ),
            ),

            level_repository: Arc::new(
                SqliteUserLevelRepository::new(
                    connection,
                ),
            ),

            scheduler: Arc::new(
                Mutex::new(
                    SchedulerState::default()
                ),
            ),
        }
    }

    pub fn reading_position(&self, user_id: &str, book_id: &str) -> Result<Option<(String, String)>, LearningError> {
        match self.book_progress_repository.find(user_id, book_id) {
            Ok(progress) => Ok(progress.last_chapter_id.zip(progress.last_element_id)),
            Err(RepositoryError::NotFound) => Ok(None),
            Err(error) => Err(LearningError::Repository(error)),
        }
    }

    pub fn save_reading_position(&self, user_id: &str, book_id: &str, chapter_id: &str, element_id: &str) -> Result<(), LearningError> {
        let mut progress = self.get_or_create_book_progress(user_id, book_id)?;
        progress.last_chapter_id = Some(chapter_id.to_owned());
        progress.last_element_id = Some(element_id.to_owned());
        progress.updated_at = Utc::now();
        self.book_progress_repository.upsert(&progress)?;
        Ok(())
    }

    //
    // ========================================================
    // EVENT
    // ========================================================
    //

    pub fn process_event(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        //
        // Basic validation.
        //

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

        //
        // Idempotency.
        //

        if self
            .event_repository
            .exists(&event.id)?
        {
            return Ok(());
        }

        //
        // Business logic.
        //

        match event.event_type {
            //
            // Vocabulary
            //

            LearningEventType::WordSeen => {
                self.handle_word_seen(event)?;
            }

            LearningEventType::TranslationOpened => {
                self.handle_translation_opened(event)?;
            }

            LearningEventType::FavoriteAdded => {
                self.handle_favorite(
                    event,
                    true,
                )?;
            }

            LearningEventType::FavoriteRemoved => {
                self.handle_favorite(
                    event,
                    false,
                )?;
            }

            LearningEventType::MarkedKnown => {
                self.handle_marked_known(event)?;
            }

            LearningEventType::MarkedUnknown => {
                self.handle_marked_unknown(event)?;
            }

            //
            // Questions
            //

            LearningEventType::QuestionAnswered => {
                self.handle_question_answered(event)?;
            }

            //
            // Exercises
            //

            LearningEventType::ExerciseStarted => {
                // Learning state не изменяем.
                // Scheduler сбросим после успешной записи события.
            }

            LearningEventType::ExerciseCompleted => {
                self.handle_exercise_completed(event)?;
            }

            LearningEventType::ExerciseSkipped => {
                // Telemetry.
            }

            //
            // Reading
            //

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
                // Telemetry.
            }

            LearningEventType::ReadingSessionFinished => {
                self.handle_reading_session(event)?;
            }
        }

        //
        // Level recalculation.
        //

        if !matches!(event.event_type, LearningEventType::ParagraphSeen | LearningEventType::ReadingSessionStarted) {
            self.recalculate_user_level(&event.user_id)?;
        }

        //
        // Event становится источником истины
        // только после успешной бизнес-логики.
        //

        self.event_repository.insert(event)?;

        //
        // Scheduler state.
        //
        // Делаем это только после успешной записи события.
        //

        self.handle_scheduler_event(event);

        Ok(())
    }

    //
    // ========================================================
    // SCHEDULER EVENTS
    // ========================================================
    //

    fn handle_scheduler_event(
        &self,
        event: &LearningEvent,
    ) {
        let Ok(mut scheduler) =
            self.scheduler.lock()
        else {
            return;
        };

        match event.event_type {
            LearningEventType::ParagraphSeen => {
                scheduler.paragraphs_since_activity =
                    scheduler
                        .paragraphs_since_activity
                        .saturating_add(1);
            }

            //
            // Любое начатое упражнение считается
            // новой learning-сессией.
            //
            LearningEventType::ExerciseStarted => {
                scheduler.paragraphs_since_activity = 0;
            }

            LearningEventType::ReadingSessionStarted => {
                scheduler.activities_this_session = 0;
            }

            _ => {}
        }
    }

    //
    // ========================================================
    // WORDS
    // ========================================================
    //

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
                self.word_repository.insert(
                    &UserWord::new(
                        user_id.to_string(),
                        word_id.to_string(),
                    ),
                )?;

                Ok(
                    self.word_repository.find(
                        user_id,
                        word_id,
                    )?
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

    //
    // --------------------------------------------------------
    // WORD SEEN
    // --------------------------------------------------------
    //
    // Очень важное правило:
    //
    // WordSeen НЕ создаёт UserWord.
    //
    // Если слово ещё не вызвало интерес,
    // мы вообще не считаем его learning-кандидатом.
    //

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
            match self.word_repository.find(
                &event.user_id,
                word_id,
            ) {
                Ok(word) => word,

                //
                // Новое слово просто встретилось.
                //
                Err(RepositoryError::NotFound) => {
                    return Ok(());
                }

                Err(error) => {
                    return Err(
                        LearningError::Repository(
                            error
                        )
                    );
                }
            };

        let timestamp =
            self.event_timestamp(event)?;

        word.exposure_count =
            word.exposure_count
                .saturating_add(1);

        //
        // first_seen_at действительно является
        // первым временем наблюдения.
        //

        if word.first_seen_at.is_none() {
            word.first_seen_at =
                Some(timestamp);
        }

        word.last_seen_at =
            Some(timestamp);

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

    //
    // --------------------------------------------------------
    // TRANSLATION OPENED
    // --------------------------------------------------------
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        //
        // Открытие перевода = пользователь
        // сознательно обратил внимание на слово.
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
                Some(timestamp);
        }

        word.last_seen_at =
            Some(timestamp);

        //
        // Первичное добавление слова
        // ставим в очередь не сразу,
        // а с небольшим delay.
        //

        if word.repetitions == 0
            && word.next_review_at.is_none()
        {
            word.next_review_at =
                Some(
                    timestamp
                        + Duration::minutes(
                            INITIAL_REVIEW_DELAY_MINUTES
                        ),
                );
        }

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

    //
    // --------------------------------------------------------
    // FAVORITE
    // --------------------------------------------------------
    //

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

        //
        // Добавление в избранное = внимание.
        //
        // Удаление из избранного само по себе
        // не должно создавать UserWord.
        //

        let mut word =
            if favorite {
                self.get_or_create_word(
                    &event.user_id,
                    word_id,
                )?
            } else {
                match self.word_repository.find(
                    &event.user_id,
                    word_id,
                ) {
                    Ok(word) => word,

                    Err(RepositoryError::NotFound) => {
                        return Ok(());
                    }

                    Err(error) => {
                        return Err(
                            LearningError::Repository(
                                error
                            )
                        );
                    }
                }
            };

        let timestamp =
            self.event_timestamp(event)?;

        if word.first_seen_at.is_none() {
            word.first_seen_at =
                Some(timestamp);
        }

        if favorite
            && word.repetitions == 0
            && word.next_review_at.is_none()
        {
            word.next_review_at =
                Some(
                    timestamp
                        + Duration::minutes(
                            INITIAL_REVIEW_DELAY_MINUTES
                        ),
                );
        }

        word.favorite = favorite;

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // MARKED KNOWN
    // --------------------------------------------------------
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        word.recognition =
            word.recognition.max(0.80);

        word.recall =
            word.recall.max(0.65);

        word.familiarity =
            word.familiarity.max(0.70);

        word.repetitions =
            word.repetitions.max(1);

        word.first_seen_at =
            word.first_seen_at
                .or(Some(timestamp));

        word.last_seen_at =
            Some(timestamp);

        word.last_reviewed_at =
            Some(timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.update_word_state(
            &mut word,
        );

        self.schedule_after_manual_known(
            &mut word,
            timestamp,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // MARKED UNKNOWN
    // --------------------------------------------------------
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        word.recognition *= 0.70;

        word.recall *= 0.55;

        word.familiarity *= 0.70;

        word.state =
            WordState::Learning;

        word.first_seen_at =
            word.first_seen_at
                .or(Some(timestamp));

        word.last_seen_at =
            Some(timestamp);

        //
        // Unknown = нужно повторить.
        //

        word.next_review_at =
            Some(timestamp);

        self.update_word_familiarity(
            &mut word,
        );

        self.word_repository.upsert(
            &word,
        )?;

        Ok(())
    }

    //
    // ========================================================
    // QUESTIONS
    // ========================================================
    //

    fn handle_question_answered(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::QuestionAnswered {
            correct,
            response_time_ms,
            selected_answer: _,
            correct_answer: _,
            word_ids,
            skill_ids,
        } = &event.data
        else {
            return Err(
                LearningError::InvalidEvent(
                    "question_answered event has invalid data"
                        .into(),
                ),
            );
        };

        let timestamp =
            self.event_timestamp(event)?;

        //
        // Каждое слово обновляется
        // как отдельная единица знаний.
        //

        for word_id in word_ids {
            self.apply_word_answer(
                &event.user_id,
                word_id,
                *correct,
                *response_time_ms,
                timestamp,
            )?;
        }

        //
        // Skills.
        //

        for skill_id in skill_ids {
            self.apply_skill_answer(
                &event.user_id,
                skill_id,
                *correct,
                0.5,
                timestamp,
            )?;
        }

        //
        // Если skill пришёл только в context.
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
                    timestamp,
                )?;
            }
        }

        Ok(())
    }

    //
    // --------------------------------------------------------
    // APPLY WORD ANSWER
    // --------------------------------------------------------
    //

    fn apply_word_answer(
        &self,
        user_id: &str,
        word_id: &str,
        correct: bool,
        response_time_ms: Option<i32>,
        timestamp: DateTime<Utc>,
    ) -> Result<(), LearningError> {
        let mut word =
            self.get_or_create_word(
                user_id,
                word_id,
            )?;

        //
        // Это первое осознанное взаимодействие
        // с этим словом.
        //

        if word.first_seen_at.is_none() {
            word.first_seen_at =
                Some(timestamp);
        }

        word.last_seen_at =
            Some(timestamp);

        if correct {
            //
            // Recall.
            //

            word.recall +=
                0.15
                    * (1.0 - word.recall);

            //
            // Recognition.
            //

            word.recognition +=
                0.08
                    * (1.0 - word.recognition);

            word.repetitions += 1;

            //
            // Быстрый правильный ответ.
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
            // Ошибка.
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

    //
    // ========================================================
    // SKILLS
    // ========================================================
    //

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
                difficulty * 0.20
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

    //
    // ========================================================
    // EXERCISES
    // ========================================================
    //

    fn handle_exercise_completed(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::ExerciseCompleted {
            correct,
            total,
            duration_ms: _,
            skill_ids,
            word_ids: _,
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
                    "exercise total is zero"
                        .into(),
                ),
            );
        }

        let accuracy =
            *correct as f64
                / *total as f64;

        let timestamp =
            self.event_timestamp(event)?;

        //
        // Очень важно:
        //
        // ExerciseCompleted НЕ обновляет UserWord.
        //
        // Слова обновляются в QuestionAnswered.
        //
        for skill_id in skill_ids {
            self.apply_skill_exercise_result(
                &event.user_id,
                skill_id,
                accuracy,
                timestamp,
            )?;
        }

        Ok(())
    }

    //
    // --------------------------------------------------------
    // EXERCISE -> SKILL
    // --------------------------------------------------------
    //

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
                difficulty * 0.20
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

    //
    // ========================================================
    // BOOK
    // ========================================================
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        progress.chapters_started += 1;

        progress.last_chapter_id =
            event.context.chapter_id.clone();

        progress.updated_at =
            timestamp;

        self.book_progress_repository.upsert(
            &progress,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // CHAPTER COMPLETED
    // --------------------------------------------------------
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        progress.chapters_completed += 1;

        progress.last_chapter_id =
            event.context.chapter_id.clone();

        progress.updated_at =
            timestamp;

        self.book_progress_repository.upsert(
            &progress,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // PARAGRAPH SEEN
    // --------------------------------------------------------
    //

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

        let timestamp =
            self.event_timestamp(event)?;

        progress.paragraphs_seen += 1;

        progress.last_element_id =
            event.context.element_id.clone();

        progress.updated_at =
            timestamp;

        self.book_progress_repository.upsert(
            &progress,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // READING SESSION
    // --------------------------------------------------------
    //

    fn handle_reading_session(
        &self,
        event: &LearningEvent,
    ) -> Result<(), LearningError> {
        let LearningEventData::ReadingSession {
            seconds,
            paragraphs_seen: _,
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

        let timestamp =
            self.event_timestamp(event)?;

        progress.reading_seconds +=
            *seconds as i64;

        //
        // paragraphs_seen здесь специально
        // НЕ увеличиваем.
        //
        // ParagraphSeen уже сделал это.
        //

        progress.updated_at =
            timestamp;

        self.book_progress_repository.upsert(
            &progress,
        )?;

        Ok(())
    }

    //
    // --------------------------------------------------------
    // GET BOOK PROGRESS
    // --------------------------------------------------------
    //

    fn get_or_create_book_progress(
        &self,
        user_id: &str,
        book_id: &str,
    ) -> Result<
        BookReadingProgress,
        LearningError,
    > {
        match self.book_progress_repository.find(
            user_id,
            book_id,
        ) {
            Ok(progress) => Ok(progress),

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

    //
    // ========================================================
    // WORD KNOWLEDGE
    // ========================================================
    //

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

    //
    // ========================================================
    // SPACED REPETITION
    // ========================================================
    //

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
                            ),
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
                            ),
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
                            ),
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
                            ),
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
                    + Duration::days(1),
            );
    }

    //
    // ========================================================
    // LEVEL
    // ========================================================
    //

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
            vocabulary * 0.40
            + grammar * 0.20
            + comprehension * 0.25
            + reading * 0.15;

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

        self.level_repository.upsert(
            &level,
        )?;

        Ok(())
    }

    //
    // ========================================================
    // NEXT ACTIVITY
    // ========================================================
    //

    pub fn next_activity(
        &self,
        user_id: &str,
        config: &LearningConfig,
    ) -> Result<
        LearningActivity,
        LearningError,
    > {
        //
        // Lock scheduler so two simultaneous
        // calls cannot create two activities.
        //

        let mut scheduler =
            self.scheduler.lock()
                .map_err(|_| {
                    LearningError::InvalidEvent(
                        "scheduler lock poisoned"
                            .into(),
                    )
                })?;

        //
        // ----------------------------------------------------
        // COOLDOWN
        // ----------------------------------------------------
        //

        if !config.enabled || !config.exercises.enabled || scheduler.activities_this_session >= config.exercises.max_per_session.max(1) as usize || scheduler
            .paragraphs_since_activity
            < MIN_PARAGRAPHS_BETWEEN_ACTIVITIES
        {
            return self.continue_reading(
                user_id,
            );
        }

        //
        // ----------------------------------------------------
        // CANDIDATES
        // ----------------------------------------------------
        //

        let mut candidates:
            Vec<ActivityCandidate> =
            Vec::new();

        //
        // ----------------------------------------------------
        // DUE WORDS
        // ----------------------------------------------------
        //

        let mut due = if config.review.enabled {
            self.word_repository.find_due(user_id)?
        } else {
            Vec::new()
        };

        //
        // Дополнительная защита:
        //
        // scheduler не должен использовать
        // Mastered / Suspended.
        //

        due.retain(|word| {
            matches!(
                word.state,
                WordState::Learning
                    | WordState::Review
            )
        });

        due.sort_by(|a, b| {
            word_priority(b)
                .partial_cmp(
                    &word_priority(a),
                )
                .unwrap_or(
                    std::cmp::Ordering::Equal
                )
        });

        //
        // WordReview candidate.
        //

        if config.review.enabled && !due.is_empty() {
            let word_ids =
                due.iter()
                    .take(config.exercises.words_per_exercise.max(1) as usize)
                    .map(|word| {
                        word.word_id.clone()
                    })
                    .collect::<Vec<_>>();

            let review = LearningActivity::WordReview {
                word_ids,
                reason:
                    "Есть слова, которые пора повторить."
                        .into(),
            };

            candidates.push(
                ActivityCandidate {
                    kind:
                        ActivityKind::WordReview,

                    base_score:
                        100.0,
                    
                    score: 
                        100.0,

                    activity:
                        review,
                },
            );

            //
            // Translation candidate.
            //
            // Позволяет менять тип упражнения
            // даже когда due-слов много.
            //

            if config.exercises.translation {
            if let Some(word) = due.first() {
                candidates.push(
                    ActivityCandidate {
                        kind:
                            ActivityKind::Translation,

                        base_score:
                            65.0,

                        score:
                            65.0,

                        activity:
                            LearningActivity::Translation {
                                word_id:
                                    word.word_id.clone(),

                                reason:
                                    "Полезно вспомнить значение одного слова."
                                        .into(),
                            },
                    },
                );
            }
        }

        //
        // ----------------------------------------------------
        // WEAK SKILL
        // ----------------------------------------------------
        //

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
                            &b.mastery,
                        )
                        .unwrap_or(
                            std::cmp::Ordering::Equal
                        )
                });

        if config.exercises.enabled {
        if let Some(skill) = weakest {
            candidates.push(
                ActivityCandidate {
                    kind:
                        ActivityKind::SkillExercise,

                    base_score:
                        70.0
                            + (
                                1.0
                                    - skill.mastery
                            )
                            * 30.0,

                    score:
                        70.0
                            + (
                                1.0
                                    - skill.mastery
                            )
                            * 30.0,

                    activity:
                        LearningActivity::SkillExercise {
                            skill_id:
                                skill.skill_id.clone(),

                            reason:
                                "Это один из слабых навыков."
                                    .into(),
                        },
                },
            );
        }
        }

        //
        // ----------------------------------------------------
        // COMPREHENSION
        // ----------------------------------------------------
        //

        let books =
            self.book_progress_repository
                .find_by_user(user_id)?;

        if config.exercises.comprehension {
        if let Some(book) = books.first() {
            if let Some(chapter_id) =
                &book.last_chapter_id
            {
                candidates.push(
                    ActivityCandidate {
                        kind:
                            ActivityKind::ComprehensionExercise,

                        base_score:
                            55.0,

                        score:
                            55.0,

                        activity:
                            LearningActivity::ComprehensionExercise {
                                book_id:
                                    book.book_id.clone(),

                                chapter_id:
                                    chapter_id.clone(),

                                reason:
                                    "Пора проверить понимание прочитанного."
                                        .into(),
                            },
                    },
                );
            }
            }
        }
        }

        //
        // ----------------------------------------------------
        // NOTHING
        // ----------------------------------------------------
        //

        if candidates.is_empty() {
            return self.continue_reading(
                user_id,
            );
        }

        //
        // ----------------------------------------------------
        // DIVERSITY
        // ----------------------------------------------------
        //

        for candidate in &mut candidates {
            let multiplier = if config.adaptive_learning {
                diversity_multiplier(
                    candidate.kind,
                    &scheduler
                        .recent_activities,
                )
            } else { 1.0 };

            candidate.score =
                candidate.base_score
                    * multiplier;
        }

        //
        // Highest score wins.
        //

        let selected =
            candidates
                .into_iter()
                .max_by(|a, b| {
                    a.score
                        .partial_cmp(
                            &b.score,
                        )
                        .unwrap_or(
                            std::cmp::Ordering::Equal
                        )
                })
                .expect(
                    "candidates is not empty"
                );

        //
        // ----------------------------------------------------
        // UPDATE SCHEDULER
        // ----------------------------------------------------
        //

        scheduler.paragraphs_since_activity =
            0;
        scheduler.activities_this_session = scheduler.activities_this_session.saturating_add(1);

        scheduler
            .recent_activities
            .push_front(
                selected.kind
            );

        while scheduler
            .recent_activities
            .len()
            > RECENT_ACTIVITY_LIMIT
        {
            scheduler
                .recent_activities
                .pop_back();
        }

        Ok(selected.activity)
    }

    //
    // --------------------------------------------------------
    // CONTINUE READING
    // --------------------------------------------------------
    //

    fn continue_reading(
        &self,
        user_id: &str,
    ) -> Result<
        LearningActivity,
        LearningError,
    > {
        let books =
            self.book_progress_repository
                .find_by_user(user_id)?;

        if let Some(book) =
            books.first()
        {
            return Ok(
                LearningActivity::ContinueReading {
                    book_id:
                        book.book_id.clone(),

                    chapter_id:
                        book.last_chapter_id
                            .clone()
                            .unwrap_or_default(),

                    reason:
                        "Пользователь продолжает чтение."
                            .into(),
                }
            );
        }

        Ok(
            LearningActivity::Rest {
                reason:
                    "Недостаточно данных для следующей активности."
                        .into(),
            }
        )
    }

    //
    // ========================================================
    // TIMESTAMP
    // ========================================================
    //

    fn event_timestamp(
        &self,
        event: &LearningEvent,
    ) -> Result<
        DateTime<Utc>,
        LearningError,
    > {
        //
        // Frontend использует:
        //
        // Date.now()
        //
        // поэтому timestamp находится
        // в миллисекундах.
        //

        DateTime::<Utc>::from_timestamp_millis(
            event.timestamp as i64,
        )
        .ok_or_else(|| {
            LearningError::Repository(
                RepositoryError::InvalidInput(
                    "Failed parse event timestamp"
                        .to_string(),
                ),
            )
        })
    }
}

//
// ============================================================
// ACTIVITY CANDIDATE
// ============================================================
//

struct ActivityCandidate {
    kind: ActivityKind,

    base_score: f64,

    score: f64,

    activity: LearningActivity,
}

//
// ============================================================
// DIVERSITY
// ============================================================
//

fn diversity_multiplier(
    kind: ActivityKind,
    recent: &VecDeque<ActivityKind>,
) -> f64 {
    //
    // Последняя activity того же типа.
    //

    if recent
        .front()
        .is_some_and(|recent_kind| {
            *recent_kind == kind
        })
    {
        return 0.20;
    }

    //
    // Эта activity была среди двух последних.
    //

    if recent
        .iter()
        .take(2)
        .any(|recent_kind| {
            *recent_kind == kind
        })
    {
        return 0.55;
    }

    //
    // Тип давно не использовался.
    //

    if !recent
        .iter()
        .take(RECENT_ACTIVITY_LIMIT)
        .any(|recent_kind| {
            *recent_kind == kind
        })
    {
        return 1.15;
    }

    1.0
}

//
// ============================================================
// REVIEW RATING
// ============================================================
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
    response_time_ms: Option<i32>,
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

//
// ============================================================
// TIME
// ============================================================
//

fn days(days: f64) -> Duration {
    Duration::seconds(
        (
            days * 86_400.0
        )
        .max(1.0)
        as i64,
    )
}

//
// ============================================================
// WORD PRIORITY
// ============================================================
//

fn word_priority(
    word: &UserWord,
) -> f64 {
    let now =
        Utc::now();

    let overdue_days =
        match word.next_review_at {
            Some(next) => {
                (
                    now - next
                )
                .num_seconds()
                .max(0)
                as f64
                    / 86_400.0
            }

            None => 0.0,
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

    overdue_days * 0.6
        + weakness * 0.3
        + favorite_bonus * 0.1
}

//
// ============================================================
// LEVEL HELPERS
// ============================================================
//

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
        word_confidence * 0.6
            + skill_confidence * 0.4
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
