use rusqlite::Connection;

#[derive(Debug, thiserror::Error)]
pub enum MigrationError {
    #[error("database error: {0}")]
    Database(#[from] rusqlite::Error),
}

struct Migration {
    version: i64,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: include_str!("migrations/001_init.sql"),
    },
];

pub fn run(
    connection: &Connection,
) -> Result<(), MigrationError> {
    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );
        ",
    )?;

    let current_version: i64 = connection.query_row(
        "
        SELECT COALESCE(MAX(version), 0)
        FROM schema_migrations
        ",
        [],
        |row| row.get(0),
    )?;

    for migration in MIGRATIONS {
        if migration.version <= current_version {
            continue;
        }

        let transaction =
            connection.unchecked_transaction()?;

        transaction.execute_batch(
            migration.sql,
        )?;

        transaction.execute(
            "
            INSERT INTO schema_migrations (
                version,
                applied_at
            )
            VALUES (
                ?1,
                unixepoch()
            )
            ",
            [migration.version],
        )?;

        transaction.commit()?;
    }

    Ok(())
}
