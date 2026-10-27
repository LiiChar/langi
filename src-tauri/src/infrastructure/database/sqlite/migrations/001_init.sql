PRAGMA foreign_keys = ON;

-- ============================================================
-- BOOKS
-- ============================================================

CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,

    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    language TEXT,

    cover_path TEXT,
    path TEXT NOT NULL UNIQUE,

    size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),

    last_read_at INTEGER,
    last_modified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_books_last_read
    ON books(last_read_at);

CREATE INDEX IF NOT EXISTS idx_books_title
    ON books(title);


-- ============================================================
-- CHAPTERS
-- ============================================================

CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,

    book_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,

    title TEXT,
    html TEXT NOT NULL,

    created_at INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE,

    UNIQUE (
        book_id,
        chapter_index
    )
);

CREATE INDEX IF NOT EXISTS idx_chapters_book
    ON chapters(book_id, chapter_index);


-- ============================================================
-- LEARNING EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_events (
    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    event_type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,

    book_id TEXT,
    chapter_id TEXT,
    element_id TEXT,

    word_id TEXT,
    exercise_id TEXT,
    skill_id TEXT,

    data TEXT NOT NULL DEFAULT '{}',

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE SET NULL,

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
        ON DELETE SET NULL,

    CHECK (data IS NOT NULL)
);

-- Основная выборка событий пользователя
CREATE INDEX IF NOT EXISTS idx_learning_events_user
    ON learning_events(user_id, timestamp);

-- История конкретного слова
CREATE INDEX IF NOT EXISTS idx_learning_events_word
    ON learning_events(user_id, word_id, timestamp);

-- История конкретной книги
CREATE INDEX IF NOT EXISTS idx_learning_events_book
    ON learning_events(user_id, book_id, timestamp);

-- История конкретной главы
CREATE INDEX IF NOT EXISTS idx_learning_events_chapter
    ON learning_events(user_id, chapter_id, timestamp);

-- История конкретного упражнения
CREATE INDEX IF NOT EXISTS idx_learning_events_exercise
    ON learning_events(user_id, exercise_id, timestamp);

-- История конкретного навыка
CREATE INDEX IF NOT EXISTS idx_learning_events_skill
    ON learning_events(user_id, skill_id, timestamp);

-- Быстрый поиск типа события
CREATE INDEX IF NOT EXISTS idx_learning_events_type
    ON learning_events(user_id, event_type, timestamp);


-- ============================================================
-- USER WORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_words (
    user_id TEXT NOT NULL,
    word_id TEXT NOT NULL,

    exposure_count INTEGER NOT NULL DEFAULT 0
        CHECK (exposure_count >= 0),

    recognition REAL NOT NULL DEFAULT 0
        CHECK (recognition >= 0 AND recognition <= 1),

    recall REAL NOT NULL DEFAULT 0
        CHECK (recall >= 0 AND recall <= 1),

    familiarity REAL NOT NULL DEFAULT 0
        CHECK (familiarity >= 0 AND familiarity <= 1),

    difficulty REAL NOT NULL DEFAULT 0.5
        CHECK (difficulty >= 0 AND difficulty <= 1),

    stability_days REAL NOT NULL DEFAULT 0.5
        CHECK (stability_days >= 0),

    repetitions INTEGER NOT NULL DEFAULT 0
        CHECK (repetitions >= 0),

    lapses INTEGER NOT NULL DEFAULT 0
        CHECK (lapses >= 0),

    favorite INTEGER NOT NULL DEFAULT 0
        CHECK (favorite IN (0, 1)),

    state TEXT NOT NULL DEFAULT 'new',

    first_seen_at INTEGER,
    last_seen_at INTEGER,
    last_reviewed_at INTEGER,
    next_review_at INTEGER,

    created_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (
        user_id,
        word_id
    )
);

-- Очередь повторения
CREATE INDEX IF NOT EXISTS idx_user_words_review
    ON user_words(user_id, next_review_at);

-- Слова по состоянию
CREATE INDEX IF NOT EXISTS idx_user_words_state
    ON user_words(user_id, state);

-- Избранные слова
CREATE INDEX IF NOT EXISTS idx_user_words_favorite
    ON user_words(user_id, favorite);


-- ============================================================
-- USER SKILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS user_skills (
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,

    mastery REAL NOT NULL DEFAULT 0
        CHECK (mastery >= 0 AND mastery <= 1),

    confidence REAL NOT NULL DEFAULT 0
        CHECK (confidence >= 0 AND confidence <= 1),

    attempts INTEGER NOT NULL DEFAULT 0
        CHECK (attempts >= 0),

    correct INTEGER NOT NULL DEFAULT 0
        CHECK (correct >= 0 AND correct <= attempts),

    last_activity_at INTEGER,

    created_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (
        user_id,
        skill_id
    )
);

CREATE INDEX IF NOT EXISTS idx_user_skills_mastery
    ON user_skills(user_id, mastery);

CREATE INDEX IF NOT EXISTS idx_user_skills_activity
    ON user_skills(user_id, last_activity_at);


-- ============================================================
-- BOOK READING PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS book_reading_progress (
    user_id TEXT NOT NULL,
    book_id TEXT NOT NULL,

    chapters_started INTEGER NOT NULL DEFAULT 0,
    chapters_completed INTEGER NOT NULL DEFAULT 0,

    reading_seconds INTEGER NOT NULL DEFAULT 0,
    paragraphs_seen INTEGER NOT NULL DEFAULT 0,

    last_chapter_id TEXT,
    last_element_id TEXT,

    vocabulary_mastery REAL NOT NULL DEFAULT 0
        CHECK (
            vocabulary_mastery >= 0
            AND vocabulary_mastery <= 1
        ),

    comprehension_mastery REAL NOT NULL DEFAULT 0
        CHECK (
            comprehension_mastery >= 0
            AND comprehension_mastery <= 1
        ),

    updated_at INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (
        user_id,
        book_id
    ),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE,

    FOREIGN KEY (last_chapter_id)
        REFERENCES chapters(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_book_progress_updated
    ON book_reading_progress(user_id, updated_at);



-- ============================================================
-- CHAPTER READING PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS chapter_reading_progress (
    user_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,

    progress REAL NOT NULL DEFAULT 0
        CHECK (progress >= 0 AND progress <= 1),

    reading_seconds INTEGER NOT NULL DEFAULT 0
        CHECK (reading_seconds >= 0),

    paragraphs_seen INTEGER NOT NULL DEFAULT 0
        CHECK (paragraphs_seen >= 0),

    completed INTEGER NOT NULL DEFAULT 0
        CHECK (completed IN (0, 1)),

    last_position REAL NOT NULL DEFAULT 0
        CHECK (last_position >= 0 AND last_position <= 1),

    last_read_at INTEGER,

    created_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (
        user_id,
        chapter_id
    ),

    FOREIGN KEY (chapter_id)
        REFERENCES chapters(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_progress_user
    ON chapter_reading_progress(user_id, last_read_at);


-- ============================================================
-- USER LEVEL
-- ============================================================

CREATE TABLE IF NOT EXISTS user_levels (
    user_id TEXT PRIMARY KEY,

    vocabulary REAL NOT NULL DEFAULT 0
        CHECK (vocabulary >= 0 AND vocabulary <= 1),

    grammar REAL NOT NULL DEFAULT 0
        CHECK (grammar >= 0 AND grammar <= 1),

    reading REAL NOT NULL DEFAULT 0
        CHECK (reading >= 0 AND reading <= 1),

    comprehension REAL NOT NULL DEFAULT 0
        CHECK (comprehension >= 0 AND comprehension <= 1),

    estimated_level TEXT NOT NULL DEFAULT 'A1',

    confidence REAL NOT NULL DEFAULT 0
        CHECK (confidence >= 0 AND confidence <= 1),

    updated_at INTEGER NOT NULL DEFAULT 0
);
