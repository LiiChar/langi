use std::str::FromStr;

use wikdict::{Dictionary, WikDictDatabase, WikDictDownloader};

use crate::infrastructure::translate::TranslationError;

pub struct LocalDictionary;

#[derive(Debug, Clone, )]
pub struct TranslateWord {
    pub word: String,
    pub translations: Vec<String>
}

impl LocalDictionary {
    pub fn new() -> Self {
        Self
    }

    pub fn translate(
        &self,
        text: &str,
        from: &str,
        to: &str,
    ) -> Result<TranslateWord, TranslationError> {

        let path = format!("./data/{}-{}.sqlite3", from, to);

        let db = WikDictDatabase::open_read_only(path).map_err(|e| {
            TranslationError::UnsupportedLanguage { from: from.to_string(), to: to.to_string() }
        })?;

        let result = db.lookup_simple(text).map_err(|e| {
            TranslationError::UnsupportedLanguage { from: from.to_string(), to: to.to_string() }
        })?;

        let result = match result.first() {
            Some(r) => r,
            None => return Err(TranslationError::UnsupportedLanguage { from: from.to_string(), to: to.to_string() })
        };

        Ok(TranslateWord {
            word: result.written_rep.clone(),
            translations: result.trans_list.values.iter().map(|v| v.clone()).collect()
        })
    }
}
