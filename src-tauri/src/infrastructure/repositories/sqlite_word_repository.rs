use crate::domain::{Word, WordRepository};
use rusqlite::Connection;

pub struct SqliteWordRepository {
    conn: Connection,
}

impl SqliteWordRepository {
    pub fn new(conn: Connection) -> Self {
        Self { conn }
    }
}

impl WordRepository for SqliteWordRepository {
    fn find_by_lemma(&self, lemma: &str) -> anyhow::Result<Option<Word>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, lemma, translation, level FROM words WHERE lemma = ?1")?;

        let mut rows = stmt.query([lemma])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Word {
                id: row.get(0)?,
                lemma: row.get(1)?,
                translation: row.get(2)?,
                level: row.get(3)?,
            }))
        } else {
            Ok(None)
        }
    }

    fn save_user_word(&self, user_id: &str, word: &Word) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT INTO user_words(user_id, word_id) VALUES (?1, ?2)",
            rusqlite::params![user_id, word.id],
        )?;

        Ok(())
    }
}
