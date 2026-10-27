use chrono::{
    DateTime,
    Utc,
};

use serde::{
    Deserialize,
    Serialize,
};
use specta::Type;
use tauri_specta::Event;

//
// LEARNING EVENT
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
pub struct LearningEvent {
    /// Уникальный ID события.
    ///
    /// Нужен для идемпотентности:
    /// одно и то же событие не должно
    /// обработаться дважды.
    pub id: String,

    pub user_id: String,

    pub event_type: LearningEventType,

    pub timestamp: f64,

    pub context: LearningEventContext,

    pub data: LearningEventData,
}

//
// EVENT TYPE
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
pub enum LearningEventType {
    //
    // Vocabulary
    //

    WordSeen,

    TranslationOpened,

    FavoriteAdded,

    FavoriteRemoved,

    MarkedKnown,

    MarkedUnknown,

    //
    // Exercises
    //

    QuestionAnswered,

    ExerciseStarted,

    ExerciseCompleted,

    ExerciseSkipped,

    //
    // Reading
    //

    ChapterOpened,

    ChapterCompleted,

    ParagraphSeen,

    ReadingSessionStarted,

    ReadingSessionFinished,
}

//
// EVENT CONTEXT
//

#[derive(
    Debug,
    Clone,
    Default,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
pub struct LearningEventContext {
    pub book_id: Option<String>,

    pub chapter_id: Option<String>,

    pub element_id: Option<String>,

    pub word_id: Option<String>,

    pub exercise_id: Option<String>,

    pub question_id: Option<String>,

    pub skill_id: Option<String>,
}

//
// EVENT DATA
//

#[derive(
    Debug,
    Clone,
    Default,
    Deserialize,
    Serialize,
    Type,
    Event,
)]
#[serde(tag = "type")]
pub enum LearningEventData {
    #[default]
    Empty,

    //
    // Word
    //

    Word {
        surface: Option<String>,
    },

    //
    // Question
    //

    QuestionAnswered {
        correct: bool,

        response_time_ms: Option<i32>,

        selected_answer: Option<String>,

        #[serde(default)]
        correct_answer: Option<String>,

        word_ids: Vec<String>,

        skill_ids: Vec<String>,
    },

    //
    // Exercise
    //

    ExerciseCompleted {
        correct: u32,

        total: u32,

        duration_ms: Option<i32>,

        skill_ids: Vec<String>,

        word_ids: Vec<String>,
    },

    //
    // Reading
    //

    ReadingSession {
        seconds: u32,

        paragraphs_seen: u32,
    },

    Paragraph {
        word_count: u32,
    },
}

//
// WORD KNOWLEDGE
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub enum WordState {
    New,

    Learning,

    Review,

    Mastered,

    Suspended,
}

impl Default for WordState {
    fn default() -> Self {
        Self::New
    }
}

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct UserWord {
    pub user_id: String,

    pub word_id: String,

    //
    // Exposure
    //

    /// Сколько раз слово встретилось
    /// пользователю.
    pub exposure_count: i64,

    //
    // Knowledge
    //

    /// Способность узнать слово
    /// среди других слов.
    ///
    /// 0.0 ..= 1.0
    pub recognition: f64,

    /// Способность самостоятельно
    /// вспомнить слово.
    ///
    /// 0.0 ..= 1.0
    pub recall: f64,

    /// Общая степень знакомства
    /// со словом.
    ///
    /// 0.0 ..= 1.0
    pub familiarity: f64,

    //
    // Difficulty / retention
    //

    /// Насколько слово сложно
    /// конкретному пользователю.
    ///
    /// 0.0 = легко
    /// 1.0 = сложно
    pub difficulty: f64,

    /// Примерное время сохранения
    /// знания в днях.
    pub stability_days: f64,

    //
    // Reviews
    //

    pub repetitions: i64,

    pub lapses: i64,

    //
    // User preferences
    //

    pub favorite: bool,

    //
    // State
    //

    pub state: WordState,

    //
    // Dates
    //

    pub first_seen_at:
        Option<DateTime<Utc>>,

    pub last_seen_at:
        Option<DateTime<Utc>>,

    pub last_reviewed_at:
        Option<DateTime<Utc>>,

    pub next_review_at:
        Option<DateTime<Utc>>,
}

impl UserWord {
    pub fn new(
        user_id: String,
        word_id: String,
    ) -> Self {
        Self {
            user_id,
            word_id,

            exposure_count: 0,

            recognition: 0.0,
            recall: 0.0,
            familiarity: 0.0,

            difficulty: 0.5,
            stability_days: 0.5,

            repetitions: 0,
            lapses: 0,

            favorite: false,

            state: WordState::New,

            first_seen_at: None,
            last_seen_at: None,
            last_reviewed_at: None,
            next_review_at: None,
        }
    }
}

//
// USER SKILL
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct UserSkill {
    pub user_id: String,

    /// Например:
    ///
    /// grammar.present_simple
    /// grammar.past_simple
    /// vocabulary.food
    /// comprehension.main_idea
    pub skill_id: String,

    /// Текущая оценка навыка.
    ///
    /// 0.0 ..= 1.0
    pub mastery: f64,

    /// Насколько система уверена
    /// в оценке mastery.
    ///
    /// 0.0 ..= 1.0
    pub confidence: f64,

    pub attempts: i64,

    pub correct: i64,

    pub last_activity_at:
        Option<DateTime<Utc>>,
}

impl UserSkill {
    pub fn new(
        user_id: String,
        skill_id: String,
    ) -> Self {
        Self {
            user_id,
            skill_id,

            mastery: 0.0,
            confidence: 0.0,

            attempts: 0,
            correct: 0,

            last_activity_at: None,
        }
    }

    pub fn accuracy(&self) -> f64 {
        if self.attempts == 0 {
            return 0.0;
        }

        self.correct as f64
            / self.attempts as f64
    }
}

//
// BOOK READING PROGRESS
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct BookReadingProgress {
    pub user_id: String,

    pub book_id: String,

    //
    // Reading
    //

    pub chapters_started: i64,

    pub chapters_completed: i64,

    pub reading_seconds: i64,

    pub paragraphs_seen: i64,

    //
    // Current position
    //

    pub last_chapter_id:
        Option<String>,

    pub last_element_id:
        Option<String>,

    //
    // Learning context
    //

    /// Насколько пользователь освоил
    /// лексику этой книги.
    pub vocabulary_mastery: f64,

    /// Насколько пользователь освоил
    /// материал книги.
    pub comprehension_mastery: f64,

    pub updated_at:
        DateTime<Utc>,
}

impl BookReadingProgress {
    pub fn new(
        user_id: String,
        book_id: String,
    ) -> Self {
        Self {
            user_id,
            book_id,

            chapters_started: 0,
            chapters_completed: 0,

            reading_seconds: 0,
            paragraphs_seen: 0,

            last_chapter_id: None,
            last_element_id: None,

            vocabulary_mastery: 0.0,
            comprehension_mastery: 0.0,

            updated_at: Utc::now(),
        }
    }
}

//
// USER LEVEL
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct UserLevel {
    pub user_id: String,

    //
    // Dimensions
    //

    pub vocabulary: f64,

    pub grammar: f64,

    pub reading: f64,

    pub comprehension: f64,

    //
    // Overall
    //

    pub estimated_level:
        CefrLevel,

    /// Уверенность системы
    /// в текущей оценке уровня.
    pub confidence: f64,

    pub updated_at:
        DateTime<Utc>,
}

impl UserLevel {
    pub fn new(
        user_id: String,
    ) -> Self {
        Self {
            user_id,

            vocabulary: 0.0,
            grammar: 0.0,
            reading: 0.0,
            comprehension: 0.0,

            estimated_level:
                CefrLevel::A1,

            confidence: 0.0,

            updated_at: Utc::now(),
        }
    }
}

//
// CEFR
//

#[derive(
    Debug,
    Clone,
    Copy,
    Deserialize,
    Serialize,
)]
pub enum CefrLevel {
    A1,
    A2,
    B1,
    B2,
    C1,
    C2,
}

impl Default for CefrLevel {
    fn default() -> Self {
        Self::A1
    }
}

//
// LEARNING ACTIVITY
//

#[derive(
    Type,
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub enum LearningActivity {
    //
    // Vocabulary
    //

    WordReview {
        word_ids: Vec<String>,

        reason: String,
    },

    Translation {
        word_id: String,

        reason: String,
    },

    //
    // Grammar / skills
    //

    SkillExercise {
        skill_id: String,

        reason: String,
    },

    //
    // Reading
    //

    ContinueReading {
        book_id: String,

        chapter_id: String,

        reason: String,
    },

    //
    // Assessment
    //

    ComprehensionExercise {
        book_id: String,

        chapter_id: String,

        reason: String,
    },

    //
    // Nothing
    //

    Rest {
        reason: String,
    },
}

//
// KNOWLEDGE SNAPSHOT
//

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct LearningSnapshot {
    pub user_id: String,

    pub level: UserLevel,

    pub words: Vec<UserWord>,

    pub skills: Vec<UserSkill>,

    pub books:
        Vec<BookReadingProgress>,
}

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub enum ExerciseType {
    Question,
    FillInTheBlank,
    MultipleChoice,
    Reading,
    Listening,
}

#[derive(
    Debug,
    Clone,
    Deserialize,
    Serialize,
)]
pub struct Exercise {
    pub id: String,

    pub exercise_type:
        ExerciseType,

    pub skill_ids:
        Vec<String>,

    pub word_ids:
        Vec<String>,
}
