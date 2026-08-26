CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,

    title TEXT NOT NULL,
    description TEXT,
    author TEXT,
    language TEXT,

    cover_path TEXT,

    path TEXT NOT NULL UNIQUE,

    size INTEGER NOT NULL DEFAULT 0,

    last_read_at INTEGER NOT NULL DEFAULT 0,
    last_modified INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chapters (
    book_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,

    title TEXT,
    html TEXT NOT NULL,

    PRIMARY KEY (
        book_id,
        chapter_index
    ),

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_books_path
    ON books(path);

CREATE INDEX IF NOT EXISTS idx_books_last_read
    ON books(last_read_at);

CREATE INDEX IF NOT EXISTS idx_books_title
    ON books(title);
