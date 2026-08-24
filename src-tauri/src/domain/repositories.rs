use crate::domain::word::Word;

pub trait WordRepository {
    fn find_by_lemma(&self, lemma: &str) -> anyhow::Result<Option<Word>>;
    fn save_user_word(&self, user_id: &str, word: &Word) -> anyhow::Result<()>;
}
