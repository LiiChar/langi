use std::{path::PathBuf, sync::RwLock};

use wikdict::WikDictDatabase;

use crate::infrastructure::translate::TranslationError;

pub struct LocalDictionary {
    directory: RwLock<PathBuf>,
}

#[derive(Debug, Clone, )]
pub struct TranslateWord {
    pub word: String,
    pub translations: Vec<String>,
    pub fully_translated: bool,
}

impl LocalDictionary {
    pub fn new() -> Self {
        Self { directory: RwLock::new(PathBuf::from("data")) }
    }

    pub fn set_directory(&self, directory: PathBuf) {
        if let Ok(mut current) = self.directory.write() {
            *current = directory;
        }
    }

    pub fn translate(
        &self,
        text: &str,
        from: &str,
        to: &str,
    ) -> Result<TranslateWord, TranslationError> {

        let directory = self.directory.read().map_err(|_| {
            TranslationError::Provider("dictionary path lock poisoned".into())
        })?;
        let path = Self::dictionary_path(&directory, from, to);

        let db = WikDictDatabase::open_read_only(path).map_err(|_e| {
            TranslationError::UnsupportedLanguage { from: from.to_string(), to: to.to_string() }
        })?;

        // WikDict stores headwords with their canonical casing (usually
        // lowercase), while reader selections may retain sentence casing.
        // Its simple lookup is an exact SQL comparison, so try the original
        // spelling first and then a normalized lowercase spelling.
        // Preserve exact multiword WikDict entries when available.
        if let Some(result) = Self::lookup(&db, text)? {
            return Ok(result);
        }

        // WikDict is a word dictionary, so a sentence rarely has an exact
        // entry. Translate known words independently and keep punctuation,
        // whitespace, and unknown words in place instead of failing the
        // entire selection because one word is missing.
        let chars: Vec<char> = text.chars().collect();
        let mut output = String::with_capacity(text.len());
        let mut translated_any = false;
        let mut fully_translated = true;
        let mut index = 0;
        while index < chars.len() {
            if !chars[index].is_alphanumeric() {
                output.push(chars[index]);
                index += 1;
                continue;
            }

            let start = index;
            while index < chars.len() && chars[index].is_alphanumeric() {
                index += 1;
            }
            let word: String = chars[start..index].iter().collect();
            if let Some(result) = Self::lookup(&db, &word)? {
                if let Some(translation) = result.translations.first() {
                    output.push_str(translation);
                    translated_any = true;
                } else {
                    output.push_str(&word);
                }
            } else {
                output.push_str(&word);
                fully_translated = false;
            }
        }

        if !translated_any {
            return Err(TranslationError::NotFound);
        }

        Ok(TranslateWord { word: text.to_owned(), translations: vec![output], fully_translated })
    }

    fn lookup(db: &WikDictDatabase, text: &str) -> Result<Option<TranslateWord>, TranslationError> {
        let result = db.lookup_simple(text).map_err(|_e| {
            TranslationError::Provider("Не удалось прочитать запись WikDict".into())
        })?;
        let result = if result.is_empty() && text != text.to_lowercase() {
            db.lookup_simple(&text.to_lowercase()).map_err(|_e| {
                TranslationError::Provider("Не удалось прочитать запись WikDict".into())
            })?
        } else {
            result
        };

        Ok(result.first().map(|entry| TranslateWord {
            word: entry.written_rep.clone(),
            translations: entry.trans_list.values.clone(),
            fully_translated: true,
        }))
    }

    pub fn dictionary_path(directory: &std::path::Path, from: &str, to: &str) -> PathBuf {
        directory.join(format!("{from}-{to}.sqlite3"))
    }
}
