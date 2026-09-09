use std::{
    path::Path,
    sync::{
        Arc,
        Mutex,
    },
};

use rusqlite::Connection;

use crate::infrastructure::database::{repository::{book::sqlite_book::SqliteBookRepository, learning::sqlite_user_level::SqliteUserLevelRepository}, sqlite::migration::{MigrationError, run}};

#[derive(Debug, thiserror::Error)]
pub enum DatabaseError {
    #[error("failed to open database: {0}")]
    Connection(#[from] rusqlite::Error),

    #[error("failed to migrate database: {0}")]
    Migration(
        #[from] MigrationError
    ),

    #[error("failed to initialize database: {0}")]
    Initialization(String),
}

pub struct SqliteDatabase {
    pub connection: Arc<Mutex<Connection>>,
}

impl SqliteDatabase {
    pub fn open(
        path: impl AsRef<Path>,
    ) -> Result<Self, DatabaseError> {
        let connection =
            Connection::open(path)?;

        connection.execute_batch(
            "
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            ",
        )?;

        run(
            &connection
        )?;

        Ok(Self {
            connection: Arc::new(
                Mutex::new(connection)
            ),
        })
    }





}
