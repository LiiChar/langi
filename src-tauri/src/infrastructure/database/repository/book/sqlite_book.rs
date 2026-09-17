use std::{
    sync::{
        Arc,
        Mutex,
    },
};

use rusqlite::{
    params,
    Connection,
};

use crate::{

    application::repositories::{book::book::BookRepository, error::RepositoryError}, domain::{
        Book,
        BookMeta,
        Chapter,
    },
};

#[derive(Clone)]
pub struct SqliteBookRepository {
    connection: Arc<Mutex<Connection>>,
}

impl SqliteBookRepository {
    pub fn new(
        connection: Arc<Mutex<Connection>>,
    ) -> Self {
        Self {
            connection,
        }
    }

    fn insert_book(
        transaction: &rusqlite::Transaction<'_>,
        book: &Book,
    ) -> Result<(), RepositoryError> {
        transaction
            .execute(
                "
                INSERT INTO books (
                    id,
                    title,
                    description,
                    author,
                    language,
                    cover_path,
                    path,
                    size,
                    last_read_at,
                    last_modified,
                    created_at
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
                    book.id,
                    book.meta.title,
                    book.meta.description,
                    book.meta.author,
                    book.meta.language,
                    book.meta.cover_path,
                    book.meta.path,
                    book.meta.size,
                    book.meta.last_read_at,
                    book.meta.last_modified,
                    book.meta.created_at,
                ],
            )
            .map_err(|error| {
                RepositoryError::DatabaseError(
                    error.to_string()
                )
            })?;

        if let Some(chapters) =
            &book.chapters
        {
            for (
                index,
                chapter,
            ) in chapters.iter().enumerate()
            {
                transaction
                    .execute(
                        "
                        INSERT INTO chapters (
                            id,
                            book_id,
                            chapter_index,
                            title,
                            html
                        )
                        VALUES (
                            ?1,
                            ?2,
                            ?3,
                            ?4,
                            ?5
                        )
                        ",
                        params![
                            chapter.id,
                            book.id,
                            index as i64,
                            chapter.title,
                            chapter.html,
                        ],
                    )
                    .map_err(|error| {
                        RepositoryError::DatabaseError(
                            error.to_string()
                        )
                    })?;
            }
        }

        Ok(())
    }

    fn map_book(
        row: &rusqlite::Row<'_>,
    ) -> rusqlite::Result<Book> {
        Ok(Book {
            id: row.get("id")?,

            meta: BookMeta {
                title: row.get("title")?,
                description: row.get("description")?,
                author: row.get("author")?,
                language: row.get("language")?,
                cover_path: row.get("cover_path")?,
                path: row.get("path")?,
                size: row.get("size")?,
                last_read_at: row.get("last_read_at")?,
                last_modified: row.get("last_modified")?,
                created_at: row.get("created_at")?,
                genres: None,
                source: None,
            },

            chapters: None,
        })
    }

    fn load_chapters(
        connection: &Connection,
        book_id: &str,
    ) -> Result<Vec<Chapter>, RepositoryError> {
        let mut statement =
            connection
                .prepare(
                    "
                    SELECT
                        id,
                        title,
                        html
                    FROM chapters
                    WHERE book_id = ?1
                    ORDER BY chapter_index
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let chapters =
            statement
                .query_map(
                    [book_id],
                    |row| {
                        Ok(Chapter {
                            id: row.get("id")?,
                            title: row.get(
                                "title"
                            )?,
                            html: row.get(
                                "html"
                            )?,
                        })
                    },
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?
                .collect::<Result<
                    Vec<_>,
                    _
                >>()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        Ok(chapters)
    }
}

impl BookRepository
    for SqliteBookRepository
{
    fn insert(
        &self,
        book: &Book,
    ) -> Result<(), RepositoryError> {
        if book.id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "book id is empty".into()
                )
            );
        }

        if book
            .meta
            .title
            .trim()
            .is_empty()
        {
            return Err(
                RepositoryError::InvalidInput(
                    "book title is empty".into()
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

        let transaction =
            connection
                .unchecked_transaction()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        Self::insert_book(
            &transaction,
            book,
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
        books: &[Book],
    ) -> Result<(), RepositoryError> {
        if books.is_empty() {
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

        for book in books {
            if book
                .id
                .trim()
                .is_empty()
            {
                return Err(
                    RepositoryError::InvalidInput(
                        "book id is empty"
                            .into()
                    )
                );
            }

            if book
                .meta
                .title
                .trim()
                .is_empty()
            {
                return Err(
                    RepositoryError::InvalidInput(
                        "book title is empty"
                            .into()
                    )
                );
            }

            Self::insert_book(
                &transaction,
                book,
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

    fn find_by_id(
        &self,
        id: &str,
    ) -> Result<Book, RepositoryError> {
        if id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "book id is empty".into()
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
                        title,
                        description,
                        author,
                        language,
                        cover_path,
                        path,
                        size,
                        last_read_at,
                        last_modified,
                        created_at
                    FROM books
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

        let mut book =
            Self::map_book(row)
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        book.chapters = Some(
            Self::load_chapters(
                &connection,
                id,
            )?
        );

        Ok(book)
    }

    fn find_all(
        &self,
    ) -> Result<Vec<Book>, RepositoryError> {
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
                        title,
                        description,
                        author,
                        language,
                        cover_path,
                        path,
                        size,
                        last_read_at,
                        last_modified,
                        created_at
                    FROM books
                    ORDER BY title COLLATE NOCASE
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let mut books =
            statement
                .query_map(
                    [],
                    Self::map_book,
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?
                .collect::<Result<
                    Vec<_>,
                    _
                >>()
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        for book in &mut books {
            book.chapters = Some(
                Self::load_chapters(
                    &connection,
                    &book.id,
                )?
            );
        }

        Ok(books)
    }

    fn find_by_path(
        &self,
        path: &str,
    ) -> Result<Book, RepositoryError> {
        if path.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "path is empty".into()
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
                        title,
                        description,
                        author,
                        language,
                        cover_path,
                        path,
                        size,
                        last_read_at,
                        last_modified,
                        created_at
                    FROM books
                    WHERE path = ?1
                    ",
                )
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        let mut rows =
            statement
                .query([path])
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

        let mut book =
            Self::map_book(row)
                .map_err(|error| {
                    RepositoryError::DatabaseError(
                        error.to_string()
                    )
                })?;

        book.chapters = Some(
            Self::load_chapters(
                &connection,
                &book.id,
            )?
        );

        Ok(book)
    }

    fn delete(
        &self,
        id: &str,
    ) -> Result<(), RepositoryError> {
        if id.trim().is_empty() {
            return Err(
                RepositoryError::InvalidInput(
                    "book id is empty".into()
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

        let affected =
            connection
                .execute(
                    "
                    DELETE FROM books
                    WHERE id = ?1
                    ",
                    [id],
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
